--here am gonna putting a generale design of the the database design module (gonna design it by myself then correcting it and improving it using Ai model this is how you gonna trully learn )
-- 1. USERS TABLE
CREATE TABLE [user] (
    id          VARCHAR(50) PRIMARY KEY, -- UUID
    full_name   VARCHAR(100) UNIQUE NOT NULL,
    password    VARCHAR(255) NULL,
    role        INT DEFAULT 2000,
    avatar      VARCHAR(500) NULL,
    created_at  DATETIME2 DEFAULT GETDATE(),
    last_seen   DATETIME2 DEFAULT GETDATE()
);

-- 2. POSTS TABLE (For Keyset Pagination & Search)
CREATE TABLE posts (
    post_id     VARCHAR(50) PRIMARY KEY, -- UUID
    user_id     VARCHAR(50) NOT NULL,
    title       VARCHAR(255) NOT NULL,
    body        VARCHAR(MAX) NOT NULL,
    view_count  INT DEFAULT 0,
    created_at  DATETIME2 DEFAULT GETDATE(),
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

-- ============================================================================
-- INDEXING STRATEGY
-- ============================================================================

-- USER LOOKUP INDEX
CREATE NONCLUSTERED INDEX IX_user_fullname 
ON [user](full_name) 
INCLUDE (id, avatar, role);

-- KEYSET PAGINATION INDEX (MODULE 2)
CREATE NONCLUSTERED INDEX IX_posts_feed
ON posts(created_at DESC, post_id DESC) 
INCLUDE (title, user_id, view_count);

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

-- FULL-TEXT SEARCH SETUP (OPTION A PREPARATION)
IF NOT EXISTS (SELECT * FROM sys.fulltext_catalogs WHERE name = 'search_posts')
    CREATE FULLTEXT CATALOG search_posts AS DEFAULT;
GO

CREATE FULLTEXT INDEX ON posts (
    title LANGUAGE 1033,
    body LANGUAGE 1033
)
KEY INDEX PK__posts__3EDC1510 -- Uses the primary key constraint name on posts
ON search_posts;
GO