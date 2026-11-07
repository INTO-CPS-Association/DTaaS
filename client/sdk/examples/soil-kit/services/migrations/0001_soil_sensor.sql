-- Depth range of each soil sensor, in metres below the surface, as the
-- upper and lower depths of the INSPIRE soil profile element.
CREATE TABLE soil_sensor (
  device_id  text PRIMARY KEY,
  depth_from double precision NOT NULL,
  depth_to   double precision NOT NULL,
  CONSTRAINT soil_sensor_device_id_fkey
    FOREIGN KEY (device_id) REFERENCES device (device_id),
  CONSTRAINT soil_sensor_depth_to_check CHECK (depth_to > depth_from)
);
