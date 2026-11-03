const {pool} = require('../../config/db'); // Your PostgreSQL connection pool

async function reserveItem(req, res) {
    const startTime = process.hrtime();
    const client = await pool.connect(); // Dedicated client for the transaction

    try {
        const { userId, itemId, quantity = 1 } = req.body;

        if (!userId || !itemId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: userId and itemId are required.'
            });
        }

        // 1. BEGIN TRANSACTION
        await client.query('BEGIN');

        // 2. Lock the specific inventory row using FOR UPDATE to prevent race conditions
        const lockQuery = `
            SELECT item_id, item_name, stock, reserved_stock 
            FROM inventory 
            WHERE item_id = $1 
            FOR UPDATE;
        `;
        const lockResult = await client.query(lockQuery, [itemId]);

        if (lockResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'Inventory item not found.' });
        }

        const item = lockResult.rows[0];
        const availableStock = item.stock - item.reserved_stock;

        // 3. Application-layer safety check (backed up by database CHECK constraints)
        if (availableStock < quantity) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                error: 'Insufficient stock available for reservation.',
                details: { availableStock, requested: quantity }
            });
        }

        // 4. Update the reserved stock count
        const updateInventoryQuery = `
            UPDATE inventory 
            SET reserved_stock = reserved_stock + $1 
            WHERE item_id = $2
            RETURNING item_id, stock, reserved_stock;
        `;
        await client.query(updateInventoryQuery, [quantity, itemId]);

        // 5. Create a temporary reservation record (TTL Pattern)
        const reservationId = `res-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // Expires in 15 minutes

        const insertReservationQuery = `
            INSERT INTO reservation (reservation_id, user_id, item_id, state, expires_at)
            VALUES ($1, $2, $3, 'HELD', $4)
            RETURNING reservation_id, state, created_at, expires_at;
        `;
        const reservationResult = await client.query(insertReservationQuery, [
            reservationId,
            userId,
            itemId,
            expiresAt
        ]);

        // 6. COMMIT TRANSACTION
        await client.query('COMMIT');

        // Calculate execution time for your diagnostic UI panel
        const elapsed = process.hrtime(startTime);
        const executionTimeMs = (elapsed[0] * 1000 + elapsed[1] / 1e6).toFixed(2);

        return res.status(201).json({
            success: true,
            meta: {
                executionTimeMs: `${executionTimeMs} ms`,
                strategy: 'ACID Transaction + Row-Level Exclusive Locking (FOR UPDATE)',
                executedQueries: [
                    'BEGIN TRANSACTION',
                    'SELECT ... FOR UPDATE (Row Lock Acquired)',
                    'UPDATE inventory SET reserved_stock ...',
                    'INSERT INTO reservation ...',
                    'COMMIT TRANSACTION'
                ]
            },
            data: {
                reservation: reservationResult.rows[0],
                inventoryState: {
                    itemId: item.item_id,
                    itemName: item.item_name,
                    totalStock: item.stock,
                    newReservedStock: item.reserved_stock + quantity
                }
            }
        });

    } catch (error) {
        // Rollback transaction on any unexpected error
        await client.query('ROLLBACK');
        console.error('Error in concurrency reservation:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal Server Error during reservation',
            details: error.message
        });
    } finally {
        // Always release the client back to the pool
        client.release();
    }
}

module.exports = { reserveItem };