-- Privacy-friendly analytics from Firebase Hosting request logs.
-- Raw logs live in the `hosting_logs` dataset (private, 90-day expiry).
-- Authorized views read the raw logs; reports below read from the `analytics` dataset.
--
-- Before running the view, check the real column names your sink created:
--   bq show --schema --format=prettyjson cloud-portfolio-509107:hosting_logs.<table name>
-- Adjust httpRequest.* below if they differ.

-- 1. A view that keeps page loads only, flags bots, and replaces the IP with a daily hash.
CREATE OR REPLACE VIEW `cloud-portfolio-509107.analytics.page_views` AS
WITH requests AS (
  SELECT
    timestamp,
    REGEXP_EXTRACT(httpRequest.requestUrl, r'^https?://[^/]+(/[^?#]*)') AS path,
    REGEXP_EXTRACT(httpRequest.requestUrl, r'[?&]src=([^&#]+)') AS src,
    REGEXP_EXTRACT(httpRequest.referer, r'^https?://([^/]+)') AS referrer_host,
    COALESCE(httpRequest.userAgent, '') AS user_agent,
    COALESCE(httpRequest.remoteIp, '') AS remote_ip,
    httpRequest.status AS status
  FROM `cloud-portfolio-509107.hosting_logs.firebasehosting_googleapis_com_webrequests`
)
SELECT
  DATE(timestamp) AS day,
  path,
  COALESCE(src, referrer_host, '(direct)') AS source,
  user_agent,
  (user_agent = '' OR REGEXP_CONTAINS(user_agent,
    r'(?i)bot|crawl|spider|slurp|preview|monitor|headless|curl|wget|python|go-http|java/|okhttp|axios|node-fetch|scrapy|facebookexternalhit|whatsapp|telegram|discord')) AS is_bot,
  REGEXP_CONTAINS(user_agent, r'(?i)mobi|android|iphone|ipad') AS is_mobile,
  TO_HEX(SHA256(CONCAT(remote_ip, '|', user_agent, '|', CAST(DATE(timestamp) AS STRING)))) AS visitor_id
FROM requests
WHERE status = 200
  AND path IS NOT NULL
  AND NOT REGEXP_CONTAINS(path, r'\.[A-Za-z0-9]+$');  -- skips scripts, styles, fonts and images

-- 2. Daily page views and unique visitors (humans only)
SELECT
  day,
  COUNT(*) AS page_views,
  COUNT(DISTINCT visitor_id) AS unique_visitors
FROM `cloud-portfolio-509107.analytics.page_views`
WHERE NOT is_bot
GROUP BY day
ORDER BY day DESC;

-- 3. Most visited pages, last 30 days
SELECT path, COUNT(*) AS views
FROM `cloud-portfolio-509107.analytics.page_views`
WHERE NOT is_bot AND day >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY path
ORDER BY views DESC
LIMIT 10;

-- 4. Where visitors come from
SELECT IFNULL(source, '(direct)') AS referrer, COUNT(*) AS views
FROM `cloud-portfolio-509107.analytics.page_views`
WHERE NOT is_bot
GROUP BY referrer
ORDER BY views DESC
LIMIT 10;

-- 5. Browsers
SELECT
  CASE
    WHEN REGEXP_CONTAINS(user_agent, r'Edg/') THEN 'Edge'
    WHEN REGEXP_CONTAINS(user_agent, r'Firefox/') THEN 'Firefox'
    WHEN REGEXP_CONTAINS(user_agent, r'Chrome/') THEN 'Chrome'
    WHEN REGEXP_CONTAINS(user_agent, r'Safari/') THEN 'Safari'
    ELSE 'Other'
  END AS browser,
  COUNT(*) AS views
FROM `cloud-portfolio-509107.analytics.page_views`
WHERE NOT is_bot
GROUP BY browser
ORDER BY views DESC;


-- ============================================================
-- Resume downloads
-- ============================================================
-- The resume is a static file, so Firebase Hosting logs every request for it.
-- The links on the site add ?src=sidebar, ?src=contact or ?src=palette, so each
-- request also says which button was used. Use ?src=linkedin (or similar) on links you share.

-- 6. A view of resume requests. 200 and 206 are real file transfers; 304 means the
--    browser reused a cached copy, so it is not counted.
CREATE OR REPLACE VIEW `cloud-portfolio-509107.analytics.resume_downloads` AS
WITH requests AS (
  SELECT
    timestamp,
    REGEXP_EXTRACT(httpRequest.requestUrl, r'^https?://[^/]+(/[^?#]*)') AS path,
    COALESCE(REGEXP_EXTRACT(httpRequest.requestUrl, r'[?&]src=([^&#]+)'), '(none)') AS source,
    COALESCE(httpRequest.userAgent, '') AS user_agent,
    COALESCE(httpRequest.remoteIp, '') AS remote_ip,
    httpRequest.status AS status
  FROM `cloud-portfolio-509107.hosting_logs.firebasehosting_googleapis_com_webrequests`
)
SELECT
  DATE(timestamp) AS day,
  timestamp,
  source,
  user_agent,
  (user_agent = '' OR REGEXP_CONTAINS(user_agent,
    r'(?i)bot|crawl|spider|slurp|preview|monitor|headless|curl|wget|python|go-http|java/|okhttp|axios|node-fetch|scrapy|facebookexternalhit|whatsapp|telegram|discord')) AS is_bot,
  TO_HEX(SHA256(CONCAT(remote_ip, '|', user_agent, '|', CAST(DATE(timestamp) AS STRING)))) AS visitor_id
FROM requests
WHERE path = '/resume.pdf'
  AND status IN (200, 206);

-- The owner-only dashboard uses a security_probes authorized view managed by Terraform.
-- It contains only day and 404 path; it never exposes IPs, user agents, or full URLs.

-- 7. Downloads per day: requests, and distinct people (the safer number, because a PDF
--    viewer can fetch the same file in several pieces)
SELECT
  day,
  COUNT(*) AS requests,
  COUNT(DISTINCT visitor_id) AS people
FROM `cloud-portfolio-509107.analytics.resume_downloads`
WHERE NOT is_bot
GROUP BY day
ORDER BY day DESC;

-- 8. Which button or link they used
SELECT source, COUNT(DISTINCT CONCAT(CAST(day AS STRING), visitor_id)) AS people
FROM `cloud-portfolio-509107.analytics.resume_downloads`
WHERE NOT is_bot
GROUP BY source
ORDER BY people DESC;

-- 9. Latest downloads (no IP addresses shown)
SELECT timestamp, source, user_agent
FROM `cloud-portfolio-509107.analytics.resume_downloads`
WHERE NOT is_bot
ORDER BY timestamp DESC
LIMIT 20;


-- ============================================================
-- Probing
-- ============================================================
-- 10. Paths that do not exist but keep getting requested: usually scanners looking for
--     /wp-login.php, /.env and similar. Reads the raw dataset, so only select the path.
SELECT
  REGEXP_EXTRACT(httpRequest.requestUrl, r'^https?://[^/]+(/[^?#]*)') AS path,
  COUNT(*) AS hits
FROM `cloud-portfolio-509107.hosting_logs.firebasehosting_googleapis_com_webrequests`
WHERE httpRequest.status = 404
GROUP BY path
ORDER BY hits DESC
LIMIT 20;
