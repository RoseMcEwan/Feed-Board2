-- Fresh MySQL 8.0.16+ / 8.4 database. This script does not drop existing data.
-- Run in MySQL Workbench with an account allowed to create a database and tables.
CREATE DATABASE IF NOT EXISTS feedboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE feedboard;

-- TABLES
CREATE TABLE IF NOT EXISTS users (
  user_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS farms (
  farm_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL UNIQUE,
  farm_name VARCHAR(100) NOT NULL,
  farm_type ENUM('dairy', 'sheep-beef') NOT NULL,
  round_length DECIMAL(14,6) NOT NULL,
  latitude DECIMAL(9,6) NOT NULL,
  longitude DECIMAL(9,6) NOT NULL,
  target_cover DECIMAL(14,6) NOT NULL,
  target_residual DECIMAL(14,6) NOT NULL,
  am_time TIME NOT NULL,
  pm_time TIME NOT NULL,
  paddock_tolerance_ha DECIMAL(7,6) NOT NULL,
  use_herd_assignment BOOLEAN NOT NULL,
  setup_completed BOOLEAN NOT NULL,
  setup_step TINYINT UNSIGNED NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_farm_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT chk_farm_round CHECK (round_length > 0 AND round_length <= 3650),
  CONSTRAINT chk_farm_coordinates CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180),
  CONSTRAINT chk_farm_cover CHECK (target_cover > 0 AND target_cover >= target_residual AND target_residual > 0),
  CONSTRAINT chk_farm_tolerance CHECK (paddock_tolerance_ha BETWEEN 0 AND 1),
  CONSTRAINT chk_farm_times CHECK (am_time >= '00:00:00' AND am_time < '12:00:00' AND pm_time >= '12:00:00' AND pm_time < '24:00:00'),
  CONSTRAINT chk_farm_flags CHECK (use_herd_assignment IN (0,1) AND setup_completed IN (0,1) AND setup_step <= 4)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS herds (
  herd_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  farm_id INT UNSIGNED NOT NULL,
  herd_name VARCHAR(60) NOT NULL,
  stock_class VARCHAR(30) NOT NULL,
  animals INT UNSIGNED NOT NULL,
  target_intake DECIMAL(14,6) NOT NULL,
  herd_colour ENUM('green','blue','amber','purple') NOT NULL,
  -- Preserve the user's list order, also used by numbered herd references during imports.
  display_order INT UNSIGNED NOT NULL,
  CONSTRAINT fk_herd_farm FOREIGN KEY (farm_id) REFERENCES farms(farm_id) ON DELETE CASCADE,
  CONSTRAINT chk_herd_animals CHECK (animals BETWEEN 1 AND 1000000),
  CONSTRAINT chk_herd_intake CHECK (target_intake > 0 AND target_intake <= 1000),
  UNIQUE KEY uq_herd_position (farm_id, display_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS paddocks (
  paddock_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  farm_id INT UNSIGNED NOT NULL,
  assigned_herd_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  paddock_name VARCHAR(80) NOT NULL,
  hectares DECIMAL(14,6) NOT NULL,
  excluded BOOLEAN NOT NULL,
  exclusion_reason ENUM('crop','young-grass','other') NULL,
  other_exclusion_reason VARCHAR(200) NULL,
  display_order INT UNSIGNED NOT NULL,
  CONSTRAINT fk_paddock_farm FOREIGN KEY (farm_id) REFERENCES farms(farm_id) ON DELETE CASCADE,
  CONSTRAINT fk_paddock_herd FOREIGN KEY (assigned_herd_id) REFERENCES herds(herd_id) ON DELETE SET NULL,
  CONSTRAINT chk_paddock_area CHECK (hectares > 0 AND hectares <= 1000000),
  CONSTRAINT chk_paddock_exclusion CHECK ((excluded = 0 AND exclusion_reason IS NULL) OR (excluded = 1 AND exclusion_reason IS NOT NULL)),
  UNIQUE KEY uq_paddock_position (farm_id, display_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS crops (
  crop_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  paddock_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  herd_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  crop_type VARCHAR(30) NOT NULL,
  other_crop_type VARCHAR(100) NULL,
  -- Saved crop records require complete feeding information.
  yield_kgdm_ha DECIMAL(14,6) NOT NULL,
  intake_kgdm_animal_day DECIMAL(14,6) NOT NULL,
  start_date DATE NOT NULL,
  CONSTRAINT fk_crop_paddock FOREIGN KEY (paddock_id) REFERENCES paddocks(paddock_id) ON DELETE CASCADE,
  CONSTRAINT fk_crop_herd FOREIGN KEY (herd_id) REFERENCES herds(herd_id) ON DELETE RESTRICT,
  CONSTRAINT chk_crop_yield CHECK (yield_kgdm_ha > 0 AND yield_kgdm_ha <= 1000000),
  CONSTRAINT chk_crop_intake CHECK (intake_kgdm_animal_day > 0 AND intake_kgdm_animal_day <= 1000)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS queues (
  queue_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  herd_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  CONSTRAINT fk_queue_herd FOREIGN KEY (herd_id) REFERENCES herds(herd_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS queue_items (
  queue_item_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  queue_id INT UNSIGNED NOT NULL,
  paddock_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  position INT UNSIGNED NOT NULL,
  CONSTRAINT fk_item_queue FOREIGN KEY (queue_id) REFERENCES queues(queue_id) ON DELETE CASCADE,
  CONSTRAINT fk_item_paddock FOREIGN KEY (paddock_id) REFERENCES paddocks(paddock_id) ON DELETE CASCADE,
  CONSTRAINT chk_item_position CHECK (position >= 1),
  UNIQUE KEY uq_queue_position (queue_id, position),
  UNIQUE KEY uq_queue_paddock (queue_id, paddock_id)
) ENGINE=InnoDB;

-- Technical login storage, not another farm entity. express-mysql-session manages expiry.
CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
  expires INT UNSIGNED NOT NULL,
  data MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  INDEX ix_session_expiry (expires)
) ENGINE=InnoDB;
