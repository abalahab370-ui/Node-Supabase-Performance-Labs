const { query } = require('../../config/dbConnection');

async function searchPosts(req, res) {
    const startTime = process.hrtime();
    
    try {
        // Sanitize Search Term
        const searchTerm = typeof req.query.q === 'string' ? req.query.q.trim() : '';

        // Strict Clamping for Limit (Min: 1, Max: 50 items per request)
        const rawLimit = parseInt(req.query.limit, 10);
        const limit = isNaN(rawLimit) ? 10 : Math.min(Math.max(rawLimit, 1), 50);

        // Strict Clamping for Offset (Min: 0, Hard Max ceiling of 500 to prevent deep scans)
        const rawOffset = parseInt(req.query.offset, 10);
        const offset = isNaN(rawOffset) ? 0 : Math.max(rawOffset, 0);
        const safeOffset = Math.min(offset, 500);

        // optimized Postgres FTS search query with CTEs
        const rawQuery = `
            WITH params AS (
                SELECT $1 AS search_term
            ),
            MatchedFeed AS (
                SELECT post_id, SUM(relevance_score) AS relevance_score
                FROM (
                    -- 1. Post Title & Body FTS using stored vector
                    SELECT 
                        p.post_id,
                        (
                            COALESCE(ts_rank(p.search_vector, plainto_tsquery('english', params.search_term)) * 10, 0)
                        ) AS relevance_score
                    FROM posts p, params
                    WHERE p.search_vector @@ plainto_tsquery('english', params.search_term)

                    UNION ALL

                    -- 2. User Full Name FTS using stored vector
                    SELECT 
                        p.post_id,
                        ts_rank(u.search_vector, plainto_tsquery('english', params.search_term)) * 10 AS relevance_score
                    FROM "user" u
                    JOIN posts p ON p.user_id = u.id, params
                    WHERE u.search_vector @@ plainto_tsquery('english', params.search_term)
                ) combined
                GROUP BY post_id
            ),
            RankedFeed AS (
                SELECT
                    p.post_id,
                    p.title,
                    p.body,
                    u.full_name,
                    f.relevance_score,
                    p.created_at
                FROM MatchedFeed f
                JOIN posts p ON f.post_id = p.post_id
                JOIN "user" u ON p.user_id = u.id
            ),
            Total AS (
                SELECT COUNT(*) AS total_count
                FROM RankedFeed
            ),
            Page AS (
                SELECT *
                FROM RankedFeed
                ORDER BY relevance_score DESC, created_at DESC
                LIMIT $2 OFFSET $3
            )
            SELECT
                Total.total_count,
                Page.post_id,
                Page.title,
                Page.body,
                Page.full_name,
                Page.relevance_score
            FROM Total
            LEFT JOIN Page ON TRUE;
        `;

        const queryParams = [searchTerm, limit, safeOffset];
        const { rows } = await query(rawQuery, queryParams);
        const totalCount = Number(rows[0]?.total_count || 0);
        const results = rows
            .filter((row) => row.post_id !== null)
            .map(({ total_count, ...post }) => post);

        // Calculate execution time for your diagnostic UI panel
        const elapsed = process.hrtime(startTime);
        const executionTimeMs = (elapsed[0] * 1000 + elapsed[1] / 1e6).toFixed(2);

        // Clean up query text for clean UI rendering
        const cleanedQueryText = rawQuery.trim().replace(/\s+/g, ' ');

        return res.status(200).json({
            success: true,
            meta: {
                executionTimeMs: `${executionTimeMs} ms`,
                strategy: 'PostgreSQL Stored Search Vectors + GIN Indexing + CTE Ranking',
                executedQuery: cleanedQueryText,
                totalCount,
                validatedParams: {
                    searchTerm,
                    limit,
                    offset: safeOffset
                }
            },
            count: results.length,
            totalCount,
            data: results
        });

    } catch (error) {
        console.error('Error executing search query:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Internal Server Error',
            details: error.message 
        });
    }
}

module.exports =  searchPosts ;