const query = require('../../config/dbConnection'); // Your PostgreSQL connection pool

async function searchPosts(req, res) {
    const startTime = process.hrtime();
    
    try {
      // Strict Clamping for Limit (Min: 1, Max: 50 items per request)
      const rawLimit = parseInt(req.query.limit, 10);
      const limit =isNaN(rawLimit) ? 10 : Math.min(Math.max(rawLimit, 1), 50);

      // Strict Clamping for Offset (Min: 0, Hard Max ceiling to prevent deep offset scans)
      const rawOffset = parseInt(req.query.offset, 10);
      const offset = isNaN(rawOffset) ? 0 : Math.max(rawOffset, 0);
      const safeOffset = Math.min(offset, 500); // Never allow an offset past 500


        // Your exact optimized Postgres FTS search query with CTEs
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
            )
            SELECT 
                p.post_id, 
                p.title, 
                p.body, 
                u.full_name,
                f.relevance_score
            FROM MatchedFeed f
            JOIN posts p ON f.post_id = p.post_id
            JOIN "user" u ON p.user_id = u.id
            ORDER BY f.relevance_score DESC, p.created_at DESC
            LIMIT $2 OFFSET $3;
        `;

        const params = [searchTerm, limit, safeOffset];
        const { rows } = await pool.query(rawQuery, params);

        // Calculate execution time for your diagnostic UI panel
        const elapsed = process.hrtime(startTime);
        const executionTimeMs = (elapsed[0] * 1000 + elapsed[1] / 1e6).toFixed(2);

        // Clean up the query text slightly for clean UI rendering (removes excessive newlines/spaces)
        const cleanedQueryText = rawQuery.trim().replace(/\s+/g, ' ');

        return res.status(200).json({
            success: true,
            meta: {
                executionTimeMs: `${executionTimeMs} ms`,
                strategy: 'PostgreSQL Stored Search Vectors + GIN Indexing + CTE Ranking',
                executedQuery: cleanedQueryText, // <--- Sent to frontend for UI inspection!
                parameters: {
                    searchTerm,
                    limit,
                    offset: safeOffset
                }
            },
            count: rows.length,
            data: rows
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