--here am gonna putting a generale design of the the database design module (gonna design it by myself then correcting it and improving it using Ai model this is how you gonna trully learn )
--well u can notice that this is ms sql server syntax not postgresql , i feel more comfortable with it cuz i master it better then postgresql , So all u have to do is asking a AI model to write the same code in postgresql for sure the FREETEXTABLE wont availbe So instead ask him to use Stored Search Vectors and do modification to the design ( probably will drop some indexes)
--a another note is that the companies does not use these kind of searches )=) , they use another softwers , advance onces that are made only for these tasks like : OpenSearch )=)

-- 1. USERS TABLE
CREATE TABLE [user] (
    id          VARCHAR(50) PRIMARY KEY, -- UUID
    full_name   VARCHAR(100) UNIQUE NOT NULL,
    password    VARCHAR(255) NULL,
    role        INT DEFAULT 2000,
    avatar      VARCHAR(500) NULL,
    created_at  DATETIME2 DEFAULT GETDATE(),
    last_seen   DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT pk_user_id PRIMARY KEY (id)
);

-- 2. POSTS TABLE (For Keyset Pagination & Search)
CREATE TABLE posts (
    post_id     VARCHAR(50) , -- UUID
    user_id     VARCHAR(50) NOT NULL,
    title       VARCHAR(255) NOT NULL,
    body        VARCHAR(MAX) NOT NULL,
    view_count  INT DEFAULT 0,
    created_at  DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT pk_posts_id PRIMARY KEY (post_id) ,
    CONSTRAINT FK_posts_user FOREIGN KEY (user_id) REFERENCES [user](id) ON DELETE CASCADE
);

-- 3. INVENTORY TABLE (With Hard Engine Safety Checks)
CREATE TABLE Inventory ( 
    item_id        VARCHAR(50) PRIMARY KEY,
    item_name      VARCHAR(150) UNIQUE NOT NULL,
    stock          INT NOT NULL CHECK (stock >= 0),
    reserved_stock INT NOT NULL DEFAULT 0,
    created_at     DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT CHK_stock_bounds CHECK (reserved_stock <= stock AND reserved_stock >= 0)
);

-- 4. RESERVATION TABLE (For Concurrency Holds)
CREATE TABLE Reservation (
    reservation_id VARCHAR(50) PRIMARY KEY,
    user_id        VARCHAR(50) NOT NULL,
    item_id        VARCHAR(50) NOT NULL,
    state          VARCHAR(20) NOT NULL DEFAULT 'HELD', -- 'HELD', 'CONFIRMED', 'EXPIRED'
    created_at     DATETIME2 DEFAULT GETDATE(),
    expires_at     DATETIME2 NOT NULL,
    CONSTRAINT FK_res_user FOREIGN KEY (user_id) REFERENCES [user](id),
    CONSTRAINT FK_res_item FOREIGN KEY (item_id) REFERENCES Inventory(item_id)
);


-- USER LOOKUP INDEX
CREATE NONCLUSTERED INDEX IX_user_fullname 
ON [user](full_name) 
INCLUDE (id, avatar, role);

-- KEYSET PAGINATION INDEX (MODULE 2)
CREATE NONCLUSTERED INDEX IX_posts_feed
ON posts(created_at DESC, post_id DESC) 
INCLUDE (title, user_id, view_count);

CREATE NONCLUSTERED INDEX IX_posts_user_id on [posts](user_id) ;
-- INVENTORY LOOKUP INDEX
CREATE NONCLUSTERED INDEX IX_inventory_search 
ON Inventory(item_name) 
INCLUDE (item_id, stock, reserved_stock);

-- RESERVATION CLEANUP & FOREIGN KEY INDEXES (MODULE 4)
CREATE NONCLUSTERED INDEX IX_reservation_cleanup 
ON Reservation(state, expires_at) 
INCLUDE (item_id, user_id);

CREATE NONCLUSTERED INDEX IX_reservation_fk_user 
ON Reservation(user_id);

CREATE NONCLUSTERED INDEX IX_reservation_fk_item 
ON Reservation(item_id);

-- FULL-TEXT SEARCH SETUP (OPTION A PREPARATION) : 
-- FOR POSTS  :
IF NOT EXISTS (SELECT * FROM sys.fulltext_catalogs WHERE name = 'search_posts')
    CREATE FULLTEXT CATALOG search_posts AS DEFAULT;


CREATE FULLTEXT INDEX ON posts (
    title LANGUAGE 1033,
    body LANGUAGE 1033
)
KEY INDEX pk_post_id -- Uses the primary key constraint name on posts
ON search_posts;


--FOR USERS :
IF NOT EXISTS (SELECT * FROM sys.fulltext_catalogs WHERE name = 'search_user')
    CREATE FULLTEXT CATALOG search_user AS DEFAULT;


CREATE FULLTEXT INDEX ON posts (
    full_name LANGUAGE 1033
)
KEY INDEX pk_user_id -- Uses the primary key constraint name on posts
ON search_posts
with stoplist = system ;


--searching methode ( the most brillant one i have created so far !)

DECLARE @searchTerm NVARCHAR(200) = N'your_search_term';
DECLARE @offset INT = 0;
DECLARE @limit INT = 10;
DECLARE @topN INT = @offset + @limit;
IF @topN > 500 SET @topN = 500;

WITH MatchedFeed AS (
    SELECT post_id, SUM(relevance_score) AS relevance_score
    FROM (
        -- 1. Post Title & Body FTS
        SELECT 
            COALESCE(ft_t.[KEY], ft_b.[KEY]) AS post_id,
            (ISNULL(ft_t.RANK, 0) * 10) + ISNULL(ft_b.RANK, 0) AS relevance_score
        FROM FREETEXTTABLE(posts, title, @searchTerm, @topN) AS ft_t
        FULL JOIN FREETEXTTABLE(posts, body, @searchTerm, @topN) AS ft_b 
            ON ft_t.[KEY] = ft_b.[KEY]

        UNION ALL

        -- 2. User Full Name FTS (mapped to their posts)
        SELECT 
            p.post_id,
            ft_u.RANK * 10 AS relevance_score
        FROM FREETEXTTABLE([user], full_name, @searchTerm, @topN) AS ft_u
        JOIN posts p ON p.user_id = ft_u.[KEY]
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
INNER JOIN posts p ON f.post_id = p.post_id
INNER JOIN [user] u ON p.user_id = u.id
ORDER BY f.relevance_score DESC, p.created_at DESC
OFFSET @offset ROWS 
FETCH NEXT @limit ROWS ONLY;