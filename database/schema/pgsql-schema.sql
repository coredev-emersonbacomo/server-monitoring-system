--
-- PostgreSQL database dump
--

<<<<<<< Updated upstream
\restrict 40SP2iiUa0SWwUvycrEkoMVB465f1od1peuRW8IvJKbHluB0UmZUS5lDfEDiMKn
=======
\restrict o9TERDHj1lbIt71dodprnIVigMMcC6UwJJNa9zMmtF705WaoQfhUA2Xmf2qjoWd
>>>>>>> Stashed changes

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: timescaledb; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS timescaledb WITH SCHEMA public;


--
-- Name: EXTENSION timescaledb; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION timescaledb IS 'Enables scalable inserts and complex queries for time-series data (Community Edition)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _compressed_hypertable_232; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._compressed_hypertable_232 (
);


--
-- Name: _compressed_hypertable_234; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._compressed_hypertable_234 (
);


--
-- Name: _compressed_hypertable_236; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._compressed_hypertable_236 (
);


--
-- Name: _compressed_hypertable_238; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._compressed_hypertable_238 (
);


--
-- Name: _compressed_hypertable_240; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._compressed_hypertable_240 (
);


--
-- Name: _compressed_hypertable_242; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._compressed_hypertable_242 (
);


--
-- Name: _compressed_hypertable_280; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._compressed_hypertable_280 (
);


--
-- Name: _compressed_hypertable_282; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._compressed_hypertable_282 (
);


--
-- Name: _compressed_hypertable_284; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._compressed_hypertable_284 (
);


--
-- Name: _compressed_hypertable_286; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._compressed_hypertable_286 (
);


--
-- Name: _compressed_hypertable_288; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._compressed_hypertable_288 (
);


--
-- Name: _compressed_hypertable_290; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._compressed_hypertable_290 (
);


--
-- Name: _compressed_hypertable_292; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._compressed_hypertable_292 (
);


--
-- Name: _compressed_hypertable_294; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._compressed_hypertable_294 (
);


--
-- Name: _compressed_hypertable_296; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._compressed_hypertable_296 (
);


--
-- Name: _compressed_hypertable_298; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._compressed_hypertable_298 (
);


--
-- Name: _compressed_hypertable_300; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._compressed_hypertable_300 (
);


--
-- Name: _compressed_hypertable_302; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._compressed_hypertable_302 (
);


--
-- Name: server_updates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.server_updates (
    id bigint NOT NULL,
    server_id bigint NOT NULL,
    cpu_usage double precision NOT NULL,
    memory_usage double precision NOT NULL,
    disk_usage double precision NOT NULL,
    uptime integer NOT NULL,
    network_rbytes bigint NOT NULL,
    network_tbytes bigint NOT NULL,
    created_at timestamp(0) with time zone NOT NULL,
    updated_at timestamp(0) with time zone
);


--
<<<<<<< Updated upstream
-- Name: _direct_view_281; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._direct_view_281 AS
=======
-- Name: _direct_view_74; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._direct_view_74 AS
>>>>>>> Stashed changes
 SELECT public.time_bucket('00:01:00'::interval, created_at) AS "timestamp",
    server_id,
    avg(cpu_usage) AS cpu,
    avg(memory_usage) AS memory,
    avg(disk_usage) AS disk,
    avg(network_rbytes) AS netin,
    avg(network_tbytes) AS netout
   FROM public.server_updates
  GROUP BY (public.time_bucket('00:01:00'::interval, created_at)), server_id;


--
<<<<<<< Updated upstream
-- Name: _direct_view_283; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._direct_view_283 AS
=======
-- Name: _direct_view_75; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._direct_view_75 AS
>>>>>>> Stashed changes
 SELECT public.time_bucket('01:00:00'::interval, created_at) AS "timestamp",
    server_id,
    avg(cpu_usage) AS cpu,
    avg(memory_usage) AS memory,
    avg(disk_usage) AS disk,
    avg(network_rbytes) AS netin,
    avg(network_tbytes) AS netout
   FROM public.server_updates
  GROUP BY (public.time_bucket('01:00:00'::interval, created_at)), server_id;


--
<<<<<<< Updated upstream
-- Name: _direct_view_285; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._direct_view_285 AS
=======
-- Name: _direct_view_76; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._direct_view_76 AS
>>>>>>> Stashed changes
 SELECT public.time_bucket('1 day'::interval, created_at) AS "timestamp",
    server_id,
    avg(cpu_usage) AS cpu,
    avg(memory_usage) AS memory,
    avg(disk_usage) AS disk,
    avg(network_rbytes) AS netin,
    avg(network_tbytes) AS netout
   FROM public.server_updates
  GROUP BY (public.time_bucket('1 day'::interval, created_at)), server_id;


--
<<<<<<< Updated upstream
-- Name: _direct_view_287; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._direct_view_287 AS
=======
-- Name: _direct_view_77; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._direct_view_77 AS
>>>>>>> Stashed changes
 SELECT public.time_bucket('7 days'::interval, created_at) AS "timestamp",
    server_id,
    avg(cpu_usage) AS cpu,
    avg(memory_usage) AS memory,
    avg(disk_usage) AS disk,
    avg(network_rbytes) AS netin,
    avg(network_tbytes) AS netout
   FROM public.server_updates
  GROUP BY (public.time_bucket('7 days'::interval, created_at)), server_id;


--
<<<<<<< Updated upstream
-- Name: _direct_view_289; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._direct_view_289 AS
=======
-- Name: _direct_view_78; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._direct_view_78 AS
>>>>>>> Stashed changes
 SELECT public.time_bucket('1 mon'::interval, created_at) AS "timestamp",
    server_id,
    avg(cpu_usage) AS cpu,
    avg(memory_usage) AS memory,
    avg(disk_usage) AS disk,
    avg(network_rbytes) AS netin,
    avg(network_tbytes) AS netout
   FROM public.server_updates
  GROUP BY (public.time_bucket('1 mon'::interval, created_at)), server_id;


--
-- Name: server_network_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.server_network_stats (
    id bigint NOT NULL,
    server_id bigint NOT NULL,
    interface_name character varying(255) NOT NULL,
    interface_type character varying(255) DEFAULT 'unknown'::character varying NOT NULL,
    oper_state character varying(255) DEFAULT 'unknown'::character varying NOT NULL,
    rx_bytes bigint NOT NULL,
    tx_bytes bigint NOT NULL,
    created_at timestamp(0) with time zone NOT NULL,
    updated_at timestamp(0) with time zone
);


--
<<<<<<< Updated upstream
-- Name: _direct_view_293; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._direct_view_293 AS
=======
-- Name: _direct_view_80; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._direct_view_80 AS
>>>>>>> Stashed changes
 SELECT public.time_bucket('00:01:00'::interval, created_at) AS "timestamp",
    server_id,
    interface_name,
    avg(rx_bytes) AS netin,
    avg(tx_bytes) AS netout
   FROM public.server_network_stats
  GROUP BY (public.time_bucket('00:01:00'::interval, created_at)), server_id, interface_name;


--
<<<<<<< Updated upstream
-- Name: _direct_view_295; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._direct_view_295 AS
=======
-- Name: _direct_view_81; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._direct_view_81 AS
>>>>>>> Stashed changes
 SELECT public.time_bucket('01:00:00'::interval, created_at) AS "timestamp",
    server_id,
    interface_name,
    avg(rx_bytes) AS netin,
    avg(tx_bytes) AS netout
   FROM public.server_network_stats
  GROUP BY (public.time_bucket('01:00:00'::interval, created_at)), server_id, interface_name;


--
<<<<<<< Updated upstream
-- Name: _direct_view_297; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._direct_view_297 AS
=======
-- Name: _direct_view_82; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._direct_view_82 AS
>>>>>>> Stashed changes
 SELECT public.time_bucket('1 day'::interval, created_at) AS "timestamp",
    server_id,
    interface_name,
    avg(rx_bytes) AS netin,
    avg(tx_bytes) AS netout
   FROM public.server_network_stats
  GROUP BY (public.time_bucket('1 day'::interval, created_at)), server_id, interface_name;


--
<<<<<<< Updated upstream
-- Name: _direct_view_299; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._direct_view_299 AS
=======
-- Name: _direct_view_83; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._direct_view_83 AS
>>>>>>> Stashed changes
 SELECT public.time_bucket('7 days'::interval, created_at) AS "timestamp",
    server_id,
    interface_name,
    avg(rx_bytes) AS netin,
    avg(tx_bytes) AS netout
   FROM public.server_network_stats
  GROUP BY (public.time_bucket('7 days'::interval, created_at)), server_id, interface_name;


--
<<<<<<< Updated upstream
-- Name: _direct_view_301; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._direct_view_301 AS
=======
-- Name: _direct_view_84; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._direct_view_84 AS
>>>>>>> Stashed changes
 SELECT public.time_bucket('1 mon'::interval, created_at) AS "timestamp",
    server_id,
    interface_name,
    avg(rx_bytes) AS netin,
    avg(tx_bytes) AS netout
   FROM public.server_network_stats
  GROUP BY (public.time_bucket('1 mon'::interval, created_at)), server_id, interface_name;


--
<<<<<<< Updated upstream
-- Name: _materialized_hypertable_281; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._materialized_hypertable_281 (
=======
-- Name: _materialized_hypertable_74; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._materialized_hypertable_74 (
>>>>>>> Stashed changes
    "timestamp" timestamp with time zone,
    server_id bigint,
    cpu double precision,
    memory double precision,
    disk double precision,
    netin numeric,
    netout numeric
);


--
<<<<<<< Updated upstream
-- Name: _materialized_hypertable_283; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._materialized_hypertable_283 (
=======
-- Name: _materialized_hypertable_75; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._materialized_hypertable_75 (
>>>>>>> Stashed changes
    "timestamp" timestamp with time zone,
    server_id bigint,
    cpu double precision,
    memory double precision,
    disk double precision,
    netin numeric,
    netout numeric
);


--
<<<<<<< Updated upstream
-- Name: _materialized_hypertable_285; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._materialized_hypertable_285 (
=======
-- Name: _materialized_hypertable_76; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._materialized_hypertable_76 (
>>>>>>> Stashed changes
    "timestamp" timestamp with time zone,
    server_id bigint,
    cpu double precision,
    memory double precision,
    disk double precision,
    netin numeric,
    netout numeric
);


--
<<<<<<< Updated upstream
-- Name: _materialized_hypertable_287; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._materialized_hypertable_287 (
=======
-- Name: _materialized_hypertable_77; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._materialized_hypertable_77 (
>>>>>>> Stashed changes
    "timestamp" timestamp with time zone,
    server_id bigint,
    cpu double precision,
    memory double precision,
    disk double precision,
    netin numeric,
    netout numeric
);


--
<<<<<<< Updated upstream
-- Name: _materialized_hypertable_289; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._materialized_hypertable_289 (
=======
-- Name: _materialized_hypertable_78; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._materialized_hypertable_78 (
>>>>>>> Stashed changes
    "timestamp" timestamp with time zone,
    server_id bigint,
    cpu double precision,
    memory double precision,
    disk double precision,
    netin numeric,
    netout numeric
);


--
<<<<<<< Updated upstream
-- Name: _materialized_hypertable_293; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._materialized_hypertable_293 (
=======
-- Name: _materialized_hypertable_80; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._materialized_hypertable_80 (
>>>>>>> Stashed changes
    "timestamp" timestamp with time zone,
    server_id bigint,
    interface_name character varying(255),
    netin numeric,
    netout numeric
);


--
<<<<<<< Updated upstream
-- Name: _materialized_hypertable_295; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._materialized_hypertable_295 (
=======
-- Name: _materialized_hypertable_81; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._materialized_hypertable_81 (
>>>>>>> Stashed changes
    "timestamp" timestamp with time zone,
    server_id bigint,
    interface_name character varying(255),
    netin numeric,
    netout numeric
);


--
<<<<<<< Updated upstream
-- Name: _materialized_hypertable_297; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._materialized_hypertable_297 (
=======
-- Name: _materialized_hypertable_82; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._materialized_hypertable_82 (
>>>>>>> Stashed changes
    "timestamp" timestamp with time zone,
    server_id bigint,
    interface_name character varying(255),
    netin numeric,
    netout numeric
);


--
<<<<<<< Updated upstream
-- Name: _materialized_hypertable_299; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._materialized_hypertable_299 (
=======
-- Name: _materialized_hypertable_83; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._materialized_hypertable_83 (
>>>>>>> Stashed changes
    "timestamp" timestamp with time zone,
    server_id bigint,
    interface_name character varying(255),
    netin numeric,
    netout numeric
);


--
<<<<<<< Updated upstream
-- Name: _materialized_hypertable_301; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._materialized_hypertable_301 (
=======
-- Name: _materialized_hypertable_84; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal._materialized_hypertable_84 (
>>>>>>> Stashed changes
    "timestamp" timestamp with time zone,
    server_id bigint,
    interface_name character varying(255),
    netin numeric,
    netout numeric
);


--
<<<<<<< Updated upstream
-- Name: _partial_view_281; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._partial_view_281 AS
=======
-- Name: _partial_view_74; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._partial_view_74 AS
>>>>>>> Stashed changes
 SELECT public.time_bucket('00:01:00'::interval, created_at) AS "timestamp",
    server_id,
    avg(cpu_usage) AS cpu,
    avg(memory_usage) AS memory,
    avg(disk_usage) AS disk,
    avg(network_rbytes) AS netin,
    avg(network_tbytes) AS netout
   FROM public.server_updates
  GROUP BY (public.time_bucket('00:01:00'::interval, created_at)), server_id;


--
<<<<<<< Updated upstream
-- Name: _partial_view_283; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._partial_view_283 AS
=======
-- Name: _partial_view_75; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._partial_view_75 AS
>>>>>>> Stashed changes
 SELECT public.time_bucket('01:00:00'::interval, created_at) AS "timestamp",
    server_id,
    avg(cpu_usage) AS cpu,
    avg(memory_usage) AS memory,
    avg(disk_usage) AS disk,
    avg(network_rbytes) AS netin,
    avg(network_tbytes) AS netout
   FROM public.server_updates
  GROUP BY (public.time_bucket('01:00:00'::interval, created_at)), server_id;


--
<<<<<<< Updated upstream
-- Name: _partial_view_285; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._partial_view_285 AS
=======
-- Name: _partial_view_76; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._partial_view_76 AS
>>>>>>> Stashed changes
 SELECT public.time_bucket('1 day'::interval, created_at) AS "timestamp",
    server_id,
    avg(cpu_usage) AS cpu,
    avg(memory_usage) AS memory,
    avg(disk_usage) AS disk,
    avg(network_rbytes) AS netin,
    avg(network_tbytes) AS netout
   FROM public.server_updates
  GROUP BY (public.time_bucket('1 day'::interval, created_at)), server_id;


--
<<<<<<< Updated upstream
-- Name: _partial_view_287; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._partial_view_287 AS
=======
-- Name: _partial_view_77; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._partial_view_77 AS
>>>>>>> Stashed changes
 SELECT public.time_bucket('7 days'::interval, created_at) AS "timestamp",
    server_id,
    avg(cpu_usage) AS cpu,
    avg(memory_usage) AS memory,
    avg(disk_usage) AS disk,
    avg(network_rbytes) AS netin,
    avg(network_tbytes) AS netout
   FROM public.server_updates
  GROUP BY (public.time_bucket('7 days'::interval, created_at)), server_id;


--
<<<<<<< Updated upstream
-- Name: _partial_view_289; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._partial_view_289 AS
=======
-- Name: _partial_view_78; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._partial_view_78 AS
>>>>>>> Stashed changes
 SELECT public.time_bucket('1 mon'::interval, created_at) AS "timestamp",
    server_id,
    avg(cpu_usage) AS cpu,
    avg(memory_usage) AS memory,
    avg(disk_usage) AS disk,
    avg(network_rbytes) AS netin,
    avg(network_tbytes) AS netout
   FROM public.server_updates
  GROUP BY (public.time_bucket('1 mon'::interval, created_at)), server_id;


--
<<<<<<< Updated upstream
-- Name: _partial_view_293; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._partial_view_293 AS
=======
-- Name: _partial_view_80; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._partial_view_80 AS
>>>>>>> Stashed changes
 SELECT public.time_bucket('00:01:00'::interval, created_at) AS "timestamp",
    server_id,
    interface_name,
    avg(rx_bytes) AS netin,
    avg(tx_bytes) AS netout
   FROM public.server_network_stats
  GROUP BY (public.time_bucket('00:01:00'::interval, created_at)), server_id, interface_name;


--
<<<<<<< Updated upstream
-- Name: _partial_view_295; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._partial_view_295 AS
=======
-- Name: _partial_view_81; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._partial_view_81 AS
>>>>>>> Stashed changes
 SELECT public.time_bucket('01:00:00'::interval, created_at) AS "timestamp",
    server_id,
    interface_name,
    avg(rx_bytes) AS netin,
    avg(tx_bytes) AS netout
   FROM public.server_network_stats
  GROUP BY (public.time_bucket('01:00:00'::interval, created_at)), server_id, interface_name;


--
<<<<<<< Updated upstream
-- Name: _partial_view_297; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._partial_view_297 AS
=======
-- Name: _partial_view_82; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._partial_view_82 AS
>>>>>>> Stashed changes
 SELECT public.time_bucket('1 day'::interval, created_at) AS "timestamp",
    server_id,
    interface_name,
    avg(rx_bytes) AS netin,
    avg(tx_bytes) AS netout
   FROM public.server_network_stats
  GROUP BY (public.time_bucket('1 day'::interval, created_at)), server_id, interface_name;


--
<<<<<<< Updated upstream
-- Name: _partial_view_299; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._partial_view_299 AS
=======
-- Name: _partial_view_83; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._partial_view_83 AS
>>>>>>> Stashed changes
 SELECT public.time_bucket('7 days'::interval, created_at) AS "timestamp",
    server_id,
    interface_name,
    avg(rx_bytes) AS netin,
    avg(tx_bytes) AS netout
   FROM public.server_network_stats
  GROUP BY (public.time_bucket('7 days'::interval, created_at)), server_id, interface_name;


--
<<<<<<< Updated upstream
-- Name: _partial_view_301; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._partial_view_301 AS
=======
-- Name: _partial_view_84; Type: VIEW; Schema: _timescaledb_internal; Owner: -
--

CREATE VIEW _timescaledb_internal._partial_view_84 AS
>>>>>>> Stashed changes
 SELECT public.time_bucket('1 mon'::interval, created_at) AS "timestamp",
    server_id,
    interface_name,
    avg(rx_bytes) AS netin,
    avg(tx_bytes) AS netout
   FROM public.server_network_stats
  GROUP BY (public.time_bucket('1 mon'::interval, created_at)), server_id, interface_name;


--
<<<<<<< Updated upstream
-- Name: compress_hyper_202_27_chunk; Type: TABLE; Schema: _timescaledb_internal; Owner: -
--

CREATE TABLE _timescaledb_internal.compress_hyper_202_27_chunk (
    _ts_meta_count integer,
    _ts_meta_min_1 timestamp with time zone,
    _ts_meta_max_1 timestamp with time zone,
    _ts_meta_v2_first_timestamp timestamp with time zone,
    _ts_meta_v2_last_timestamp timestamp with time zone,
    "timestamp" _timescaledb_internal.compressed_data,
    _ts_meta_min_2 bigint,
    _ts_meta_max_2 bigint,
    _ts_meta_v2_first_server_id bigint,
    _ts_meta_v2_last_server_id bigint,
    server_id _timescaledb_internal.compressed_data,
    cpu _timescaledb_internal.compressed_data,
    memory _timescaledb_internal.compressed_data,
    disk _timescaledb_internal.compressed_data,
    netin _timescaledb_internal.compressed_data,
    netout _timescaledb_internal.compressed_data,
    _ts_meta_v2_bloomh_6baa_timestamp_server_id _timescaledb_internal.bloom1
)
WITH (toast_tuple_target='128');
ALTER TABLE ONLY _timescaledb_internal.compress_hyper_202_27_chunk ALTER COLUMN _ts_meta_count SET STATISTICS 1000;
ALTER TABLE ONLY _timescaledb_internal.compress_hyper_202_27_chunk ALTER COLUMN _ts_meta_min_1 SET STATISTICS 1000;
ALTER TABLE ONLY _timescaledb_internal.compress_hyper_202_27_chunk ALTER COLUMN _ts_meta_max_1 SET STATISTICS 1000;
ALTER TABLE ONLY _timescaledb_internal.compress_hyper_202_27_chunk ALTER COLUMN _ts_meta_v2_first_timestamp SET STATISTICS 1000;
ALTER TABLE ONLY _timescaledb_internal.compress_hyper_202_27_chunk ALTER COLUMN _ts_meta_v2_last_timestamp SET STATISTICS 1000;
ALTER TABLE ONLY _timescaledb_internal.compress_hyper_202_27_chunk ALTER COLUMN "timestamp" SET STATISTICS 0;
ALTER TABLE ONLY _timescaledb_internal.compress_hyper_202_27_chunk ALTER COLUMN _ts_meta_min_2 SET STATISTICS 1000;
ALTER TABLE ONLY _timescaledb_internal.compress_hyper_202_27_chunk ALTER COLUMN _ts_meta_max_2 SET STATISTICS 1000;
ALTER TABLE ONLY _timescaledb_internal.compress_hyper_202_27_chunk ALTER COLUMN _ts_meta_v2_first_server_id SET STATISTICS 1000;
ALTER TABLE ONLY _timescaledb_internal.compress_hyper_202_27_chunk ALTER COLUMN _ts_meta_v2_last_server_id SET STATISTICS 1000;
ALTER TABLE ONLY _timescaledb_internal.compress_hyper_202_27_chunk ALTER COLUMN server_id SET STATISTICS 0;
ALTER TABLE ONLY _timescaledb_internal.compress_hyper_202_27_chunk ALTER COLUMN cpu SET STATISTICS 0;
ALTER TABLE ONLY _timescaledb_internal.compress_hyper_202_27_chunk ALTER COLUMN memory SET STATISTICS 0;
ALTER TABLE ONLY _timescaledb_internal.compress_hyper_202_27_chunk ALTER COLUMN disk SET STATISTICS 0;
ALTER TABLE ONLY _timescaledb_internal.compress_hyper_202_27_chunk ALTER COLUMN netin SET STATISTICS 0;
ALTER TABLE ONLY _timescaledb_internal.compress_hyper_202_27_chunk ALTER COLUMN netin SET STORAGE EXTENDED;
ALTER TABLE ONLY _timescaledb_internal.compress_hyper_202_27_chunk ALTER COLUMN netout SET STATISTICS 0;
ALTER TABLE ONLY _timescaledb_internal.compress_hyper_202_27_chunk ALTER COLUMN netout SET STORAGE EXTENDED;
ALTER TABLE ONLY _timescaledb_internal.compress_hyper_202_27_chunk ALTER COLUMN _ts_meta_v2_bloomh_6baa_timestamp_server_id SET STATISTICS 1000;
ALTER TABLE ONLY _timescaledb_internal.compress_hyper_202_27_chunk ALTER COLUMN _ts_meta_v2_bloomh_6baa_timestamp_server_id SET STORAGE MAIN;


--
=======
>>>>>>> Stashed changes
-- Name: action_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.action_items (
    id bigint NOT NULL,
    action_type character varying(255) NOT NULL,
    server_id bigint,
    client_id bigint,
    message character varying(255) NOT NULL,
    severity character varying(255) NOT NULL,
    client_name character varying(255),
    server_name character varying(255),
    assigned_to bigint,
    status character varying(255) DEFAULT 'open'::character varying NOT NULL,
    completed_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: action_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.action_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: action_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.action_items_id_seq OWNED BY public.action_items.id;


--
-- Name: activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activities (
    id bigint NOT NULL,
    server_id bigint NOT NULL,
    agent_id bigint,
    type character varying(255) NOT NULL,
    description text NOT NULL,
    metadata json,
    performed_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: activities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activities_id_seq OWNED BY public.activities.id;


--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id bigint NOT NULL,
    type character varying(255) DEFAULT 'activity'::character varying NOT NULL,
    logable_type character varying(255),
    logable_id character varying(255),
    user_id bigint,
    "user" character varying(255),
    action character varying(255) NOT NULL,
    title character varying(255),
    details json,
    severity character varying(255) DEFAULT 'warning'::character varying,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activity_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activity_logs_id_seq OWNED BY public.activity_logs.id;


--
-- Name: activity_logs_id_seq1; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activity_logs_id_seq1
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agent_challenges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_challenges (
    id bigint NOT NULL,
    agent_id bigint NOT NULL,
    challenge character varying(128) NOT NULL,
    status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    expires_at timestamp(0) without time zone NOT NULL,
    used_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: agent_challenges_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agent_challenges_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agent_challenges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agent_challenges_id_seq OWNED BY public.agent_challenges.id;


--
-- Name: agent_commands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_commands (
    id bigint NOT NULL,
    agent_id bigint NOT NULL,
    type character varying(255) NOT NULL,
    priority integer DEFAULT 100 NOT NULL,
    payload json,
    status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    sent_at timestamp(0) without time zone,
    started_at timestamp(0) without time zone,
    completed_at timestamp(0) without time zone,
    expires_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: agent_commands_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agent_commands_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agent_commands_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agent_commands_id_seq OWNED BY public.agent_commands.id;


--
-- Name: agent_configurations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_configurations (
    id bigint NOT NULL,
    agent_id bigint NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    heartbeat_interval integer DEFAULT 5 NOT NULL,
    metrics_interval integer DEFAULT 5 NOT NULL,
    port_scan_interval integer DEFAULT 60 NOT NULL,
    service_scan_interval integer DEFAULT 60 NOT NULL,
    process_scan_interval integer DEFAULT 60 NOT NULL,
    update_channel character varying(255) DEFAULT 'stable'::character varying NOT NULL,
    auto_update boolean DEFAULT true NOT NULL,
    configuration_json json NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: agent_configurations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agent_configurations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agent_configurations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agent_configurations_id_seq OWNED BY public.agent_configurations.id;


--
-- Name: agent_identities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_identities (
    id bigint NOT NULL,
    agent_id bigint NOT NULL,
    identity_hash character varying(255) NOT NULL,
    status character varying(255) DEFAULT 'active'::character varying NOT NULL,
    issued_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(0) without time zone,
    revoked_at timestamp(0) without time zone,
    last_used_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: agent_identities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agent_identities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agent_identities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agent_identities_id_seq OWNED BY public.agent_identities.id;


--
-- Name: agent_installations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_installations (
    id bigint NOT NULL,
    server_id bigint NOT NULL,
    installer_version character varying(255) NOT NULL,
    operating_system character varying(255),
    architecture character varying(255),
    hostname character varying(255),
    started_at timestamp(0) without time zone NOT NULL,
    completed_at timestamp(0) without time zone,
    failed_at timestamp(0) without time zone,
    failure_reason text,
    status character varying(255) NOT NULL,
    initiated_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: agent_installations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agent_installations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agent_installations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agent_installations_id_seq OWNED BY public.agent_installations.id;


--
-- Name: agent_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_versions (
    id bigint NOT NULL,
    version character varying(255) NOT NULL,
    binary_url character varying(255),
    description text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: agent_versions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agent_versions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agent_versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agent_versions_id_seq OWNED BY public.agent_versions.id;


--
-- Name: agents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agents (
    id bigint NOT NULL,
    server_id bigint,
    version character varying(255) NOT NULL,
    protocol_version character varying(255) NOT NULL,
    configuration_version integer DEFAULT 1 NOT NULL,
    status character varying(255) NOT NULL,
    registered_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_seen_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    public_key text,
    public_key_hash character varying(64),
    installation_uuid character varying(36),
    revoked_at timestamp(0) without time zone,
    available_processes json,
    available_ports json,
    available_interfaces json
);


--
-- Name: agents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agents_id_seq OWNED BY public.agents.id;


--
-- Name: auth_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_audit_logs (
    id bigint NOT NULL,
    user_id bigint,
    session_uuid uuid,
    event_type character varying(50) NOT NULL,
    ip_address character varying(45),
    user_agent text,
    metadata json,
    created_at timestamp(0) without time zone
);


--
-- Name: auth_audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.auth_audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: auth_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.auth_audit_logs_id_seq OWNED BY public.auth_audit_logs.id;


--
-- Name: cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cache (
    key character varying(255) NOT NULL,
    value text NOT NULL,
    expiration bigint NOT NULL
);


--
-- Name: cache_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cache_locks (
    key character varying(255) NOT NULL,
    owner character varying(255) NOT NULL,
    expiration bigint NOT NULL
);


--
-- Name: client_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_alerts (
    id bigint NOT NULL,
    client_id bigint NOT NULL,
    metric character varying(255) NOT NULL,
    threshold integer NOT NULL,
    notification_channel character varying(255) NOT NULL
);


--
-- Name: client_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.client_alerts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.client_alerts_id_seq OWNED BY public.client_alerts.id;


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id bigint NOT NULL,
    uuid uuid NOT NULL,
    name character varying(255) NOT NULL,
    description character varying(255),
    email character varying(255) NOT NULL,
    contact_number character varying(255),
    budget numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    location character varying(255) NOT NULL,
    banner_image_url text DEFAULT 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Y29ycG9yYXRlJTIwYnVpbGRpbmd8ZW58MHx8MHx8fDA%3D'::text NOT NULL,
    record_status character varying(255) DEFAULT 'active'::character varying NOT NULL,
    alert_scope character varying(255) DEFAULT 'global'::character varying NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    banner_image_public_id character varying(255),
    banner_image_storage_key character varying(255),
    total_subscription_fee numeric(12,2) DEFAULT '0'::numeric NOT NULL
);


--
-- Name: clients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clients_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;


--
-- Name: command_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.command_results (
    id bigint NOT NULL,
    command_id bigint NOT NULL,
    status character varying(255) NOT NULL,
    output text,
    error_message text,
    execution_time_ms integer,
    reported_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: command_results_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.command_results_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: command_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.command_results_id_seq OWNED BY public.command_results.id;


--
-- Name: configuration_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.configuration_history (
    id bigint NOT NULL,
    agent_id bigint NOT NULL,
    version integer NOT NULL,
    configuration_json json NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: configuration_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.configuration_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: configuration_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.configuration_history_id_seq OWNED BY public.configuration_history.id;


--
-- Name: failed_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.failed_jobs (
    id bigint NOT NULL,
    uuid character varying(255) NOT NULL,
    connection character varying(255) NOT NULL,
    queue character varying(255) NOT NULL,
    payload text NOT NULL,
    exception text NOT NULL,
    failed_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: failed_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.failed_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: failed_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.failed_jobs_id_seq OWNED BY public.failed_jobs.id;


--
-- Name: global_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.global_alerts (
    id bigint NOT NULL,
    metric character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    threshold smallint NOT NULL,
    severity character varying(255) NOT NULL,
    channels json NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    CONSTRAINT global_alerts_severity_check CHECK (((severity)::text = ANY ((ARRAY['light'::character varying, 'warning'::character varying, 'critical'::character varying])::text[])))
);


--
-- Name: global_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.global_alerts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: global_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.global_alerts_id_seq OWNED BY public.global_alerts.id;


--
-- Name: heartbeats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.heartbeats (
    id bigint NOT NULL,
    agent_id bigint NOT NULL,
    latency_ms integer,
    agent_time timestamp(0) without time zone,
    status character varying(255) NOT NULL,
    received_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: heartbeats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.heartbeats_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: heartbeats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.heartbeats_id_seq OWNED BY public.heartbeats.id;


--
-- Name: job_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_batches (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    total_jobs integer NOT NULL,
    pending_jobs integer NOT NULL,
    failed_jobs integer NOT NULL,
    failed_job_ids text NOT NULL,
    options text,
    cancelled_at integer,
    created_at integer NOT NULL,
    finished_at integer
);


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jobs (
    id bigint NOT NULL,
    queue character varying(255) NOT NULL,
    payload text NOT NULL,
    attempts smallint NOT NULL,
    reserved_at integer,
    available_at integer NOT NULL,
    created_at integer NOT NULL
);


--
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;


--
-- Name: local_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.local_alerts (
    id bigint NOT NULL,
    server_id bigint NOT NULL,
    metric character varying(255) NOT NULL,
    threshold integer NOT NULL,
    notification_channel character varying(255) NOT NULL
);


--
-- Name: local_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.local_alerts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: local_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.local_alerts_id_seq OWNED BY public.local_alerts.id;


--
-- Name: metric_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.metric_batches (
    id bigint NOT NULL,
    heartbeat_id bigint,
    agent_id bigint NOT NULL,
    collector_version character varying(255),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: metric_batches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.metric_batches_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: metric_batches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.metric_batches_id_seq OWNED BY public.metric_batches.id;


--
-- Name: metric_samples; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.metric_samples (
    id bigint NOT NULL,
    batch_id bigint NOT NULL,
    metric_type character varying(255) NOT NULL,
    metric_name character varying(255) NOT NULL,
    value double precision NOT NULL,
    unit character varying(255),
    recorded_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: metric_samples_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.metric_samples_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: metric_samples_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.metric_samples_id_seq OWNED BY public.metric_samples.id;


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    migration character varying(255) NOT NULL,
    batch integer NOT NULL
);


--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: node_config_states; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.node_config_states (
    id bigint NOT NULL,
    node_config_id bigint NOT NULL,
    node_id character varying(255) NOT NULL,
    output_value json,
    context json,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    server_id bigint
);


--
-- Name: node_config_states_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.node_config_states_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: node_config_states_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.node_config_states_id_seq OWNED BY public.node_config_states.id;


--
-- Name: node_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.node_configs (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    config json NOT NULL,
    created_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    slug character varying(255),
    compiled_config json,
    scope_type character varying(255) DEFAULT 'global'::character varying NOT NULL,
    scope_id character varying(255)
);


--
-- Name: node_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.node_configs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: node_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.node_configs_id_seq OWNED BY public.node_configs.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    email character varying(255) NOT NULL,
    created_at timestamp(0) without time zone,
    code character varying(255),
    code_expires_at timestamp(0) without time zone,
    reset_token character varying(255),
    reset_token_expires_at timestamp(0) without time zone
);


--
-- Name: personal_access_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personal_access_tokens (
    id bigint NOT NULL,
    tokenable_type character varying(255) NOT NULL,
    tokenable_id bigint NOT NULL,
    name text NOT NULL,
    token character varying(64) NOT NULL,
    abilities text,
    last_used_at timestamp(0) without time zone,
    expires_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.personal_access_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: personal_access_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.personal_access_tokens_id_seq OWNED BY public.personal_access_tokens.id;


--
-- Name: ports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ports (
    id bigint NOT NULL,
    agent_id bigint NOT NULL,
    protocol character varying(255) NOT NULL,
    port integer NOT NULL,
    state character varying(255) NOT NULL,
    process_name character varying(255),
    last_seen timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    ping_status character varying(255),
    ping_time integer
);


--
-- Name: ports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ports_id_seq OWNED BY public.ports.id;


--
-- Name: processes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.processes (
    id bigint NOT NULL,
    agent_id bigint NOT NULL,
    pid integer NOT NULL,
    name character varying(255) NOT NULL,
    cpu double precision,
    memory double precision,
    command_line text,
    last_seen timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    pids json
);


--
-- Name: processes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.processes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: processes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.processes_id_seq OWNED BY public.processes.id;


--
-- Name: provision_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provision_tokens (
    id bigint NOT NULL,
    server_id bigint NOT NULL,
    token character varying(255) NOT NULL,
    status character varying(255) DEFAULT 'active'::character varying NOT NULL,
    expires_at timestamp(0) without time zone NOT NULL,
    used_at timestamp(0) without time zone,
    revoked_at timestamp(0) without time zone,
    created_by bigint,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: provision_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.provision_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: provision_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.provision_tokens_id_seq OWNED BY public.provision_tokens.id;


--
-- Name: refresh_token_rotations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_token_rotations (
    id bigint NOT NULL,
    session_id bigint NOT NULL,
    refresh_token_id character varying(64) NOT NULL,
    refresh_token_hash character varying(64) NOT NULL,
    rotated_at timestamp(0) without time zone NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: refresh_token_rotations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.refresh_token_rotations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_token_rotations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.refresh_token_rotations_id_seq OWNED BY public.refresh_token_rotations.id;


--
-- Name: sec_op_clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sec_op_clients (
    uuid uuid NOT NULL,
    client_id bigint NOT NULL,
    user_id bigint NOT NULL,
    record_status character varying(255) DEFAULT 'active'::character varying NOT NULL
);


--
-- Name: server_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.server_logs (
    id bigint NOT NULL,
    server_id bigint NOT NULL,
    log_content text NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: server_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.server_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: server_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.server_logs_id_seq OWNED BY public.server_logs.id;


--
-- Name: server_network_stats_agg_day; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.server_network_stats_agg_day AS
<<<<<<< Updated upstream
 SELECT _materialized_hypertable_297."timestamp",
    _materialized_hypertable_297.server_id,
    _materialized_hypertable_297.interface_name,
    _materialized_hypertable_297.netin,
    _materialized_hypertable_297.netout
   FROM _timescaledb_internal._materialized_hypertable_297
  WHERE (_materialized_hypertable_297."timestamp" < COALESCE(_timescaledb_functions.to_timestamp(_timescaledb_functions.cagg_watermark(297)), '-infinity'::timestamp with time zone))
=======
 SELECT _materialized_hypertable_82."timestamp",
    _materialized_hypertable_82.server_id,
    _materialized_hypertable_82.interface_name,
    _materialized_hypertable_82.netin,
    _materialized_hypertable_82.netout
   FROM _timescaledb_internal._materialized_hypertable_82
  WHERE (_materialized_hypertable_82."timestamp" < COALESCE(_timescaledb_functions.to_timestamp(_timescaledb_functions.cagg_watermark(82)), '-infinity'::timestamp with time zone))
>>>>>>> Stashed changes
UNION ALL
 SELECT public.time_bucket('1 day'::interval, server_network_stats.created_at) AS "timestamp",
    server_network_stats.server_id,
    server_network_stats.interface_name,
    avg(server_network_stats.rx_bytes) AS netin,
    avg(server_network_stats.tx_bytes) AS netout
   FROM public.server_network_stats
<<<<<<< Updated upstream
  WHERE (server_network_stats.created_at >= COALESCE(_timescaledb_functions.to_timestamp(_timescaledb_functions.cagg_watermark(297)), '-infinity'::timestamp with time zone))
=======
  WHERE (server_network_stats.created_at >= COALESCE(_timescaledb_functions.to_timestamp(_timescaledb_functions.cagg_watermark(82)), '-infinity'::timestamp with time zone))
>>>>>>> Stashed changes
  GROUP BY (public.time_bucket('1 day'::interval, server_network_stats.created_at)), server_network_stats.server_id, server_network_stats.interface_name;


--
-- Name: server_network_stats_agg_hour; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.server_network_stats_agg_hour AS
<<<<<<< Updated upstream
 SELECT _materialized_hypertable_295."timestamp",
    _materialized_hypertable_295.server_id,
    _materialized_hypertable_295.interface_name,
    _materialized_hypertable_295.netin,
    _materialized_hypertable_295.netout
   FROM _timescaledb_internal._materialized_hypertable_295
  WHERE (_materialized_hypertable_295."timestamp" < COALESCE(_timescaledb_functions.to_timestamp(_timescaledb_functions.cagg_watermark(295)), '-infinity'::timestamp with time zone))
=======
 SELECT _materialized_hypertable_81."timestamp",
    _materialized_hypertable_81.server_id,
    _materialized_hypertable_81.interface_name,
    _materialized_hypertable_81.netin,
    _materialized_hypertable_81.netout
   FROM _timescaledb_internal._materialized_hypertable_81
  WHERE (_materialized_hypertable_81."timestamp" < COALESCE(_timescaledb_functions.to_timestamp(_timescaledb_functions.cagg_watermark(81)), '-infinity'::timestamp with time zone))
>>>>>>> Stashed changes
UNION ALL
 SELECT public.time_bucket('01:00:00'::interval, server_network_stats.created_at) AS "timestamp",
    server_network_stats.server_id,
    server_network_stats.interface_name,
    avg(server_network_stats.rx_bytes) AS netin,
    avg(server_network_stats.tx_bytes) AS netout
   FROM public.server_network_stats
<<<<<<< Updated upstream
  WHERE (server_network_stats.created_at >= COALESCE(_timescaledb_functions.to_timestamp(_timescaledb_functions.cagg_watermark(295)), '-infinity'::timestamp with time zone))
=======
  WHERE (server_network_stats.created_at >= COALESCE(_timescaledb_functions.to_timestamp(_timescaledb_functions.cagg_watermark(81)), '-infinity'::timestamp with time zone))
>>>>>>> Stashed changes
  GROUP BY (public.time_bucket('01:00:00'::interval, server_network_stats.created_at)), server_network_stats.server_id, server_network_stats.interface_name;


--
-- Name: server_network_stats_agg_minute; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.server_network_stats_agg_minute AS
<<<<<<< Updated upstream
 SELECT _materialized_hypertable_293."timestamp",
    _materialized_hypertable_293.server_id,
    _materialized_hypertable_293.interface_name,
    _materialized_hypertable_293.netin,
    _materialized_hypertable_293.netout
   FROM _timescaledb_internal._materialized_hypertable_293
  WHERE (_materialized_hypertable_293."timestamp" < COALESCE(_timescaledb_functions.to_timestamp(_timescaledb_functions.cagg_watermark(293)), '-infinity'::timestamp with time zone))
=======
 SELECT _materialized_hypertable_80."timestamp",
    _materialized_hypertable_80.server_id,
    _materialized_hypertable_80.interface_name,
    _materialized_hypertable_80.netin,
    _materialized_hypertable_80.netout
   FROM _timescaledb_internal._materialized_hypertable_80
  WHERE (_materialized_hypertable_80."timestamp" < COALESCE(_timescaledb_functions.to_timestamp(_timescaledb_functions.cagg_watermark(80)), '-infinity'::timestamp with time zone))
>>>>>>> Stashed changes
UNION ALL
 SELECT public.time_bucket('00:01:00'::interval, server_network_stats.created_at) AS "timestamp",
    server_network_stats.server_id,
    server_network_stats.interface_name,
    avg(server_network_stats.rx_bytes) AS netin,
    avg(server_network_stats.tx_bytes) AS netout
   FROM public.server_network_stats
<<<<<<< Updated upstream
  WHERE (server_network_stats.created_at >= COALESCE(_timescaledb_functions.to_timestamp(_timescaledb_functions.cagg_watermark(293)), '-infinity'::timestamp with time zone))
=======
  WHERE (server_network_stats.created_at >= COALESCE(_timescaledb_functions.to_timestamp(_timescaledb_functions.cagg_watermark(80)), '-infinity'::timestamp with time zone))
>>>>>>> Stashed changes
  GROUP BY (public.time_bucket('00:01:00'::interval, server_network_stats.created_at)), server_network_stats.server_id, server_network_stats.interface_name;


--
-- Name: server_network_stats_agg_month; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.server_network_stats_agg_month AS
<<<<<<< Updated upstream
 SELECT _materialized_hypertable_301."timestamp",
    _materialized_hypertable_301.server_id,
    _materialized_hypertable_301.interface_name,
    _materialized_hypertable_301.netin,
    _materialized_hypertable_301.netout
   FROM _timescaledb_internal._materialized_hypertable_301
  WHERE (_materialized_hypertable_301."timestamp" < COALESCE(_timescaledb_functions.to_timestamp(_timescaledb_functions.cagg_watermark(301)), '-infinity'::timestamp with time zone))
=======
 SELECT _materialized_hypertable_84."timestamp",
    _materialized_hypertable_84.server_id,
    _materialized_hypertable_84.interface_name,
    _materialized_hypertable_84.netin,
    _materialized_hypertable_84.netout
   FROM _timescaledb_internal._materialized_hypertable_84
  WHERE (_materialized_hypertable_84."timestamp" < COALESCE(_timescaledb_functions.to_timestamp(_timescaledb_functions.cagg_watermark(84)), '-infinity'::timestamp with time zone))
>>>>>>> Stashed changes
UNION ALL
 SELECT public.time_bucket('1 mon'::interval, server_network_stats.created_at) AS "timestamp",
    server_network_stats.server_id,
    server_network_stats.interface_name,
    avg(server_network_stats.rx_bytes) AS netin,
    avg(server_network_stats.tx_bytes) AS netout
   FROM public.server_network_stats
<<<<<<< Updated upstream
  WHERE (server_network_stats.created_at >= COALESCE(_timescaledb_functions.to_timestamp(_timescaledb_functions.cagg_watermark(301)), '-infinity'::timestamp with time zone))
=======
  WHERE (server_network_stats.created_at >= COALESCE(_timescaledb_functions.to_timestamp(_timescaledb_functions.cagg_watermark(84)), '-infinity'::timestamp with time zone))
>>>>>>> Stashed changes
  GROUP BY (public.time_bucket('1 mon'::interval, server_network_stats.created_at)), server_network_stats.server_id, server_network_stats.interface_name;


--
-- Name: server_network_stats_agg_week; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.server_network_stats_agg_week AS
<<<<<<< Updated upstream
 SELECT _materialized_hypertable_299."timestamp",
    _materialized_hypertable_299.server_id,
    _materialized_hypertable_299.interface_name,
    _materialized_hypertable_299.netin,
    _materialized_hypertable_299.netout
   FROM _timescaledb_internal._materialized_hypertable_299
  WHERE (_materialized_hypertable_299."timestamp" < COALESCE(_timescaledb_functions.to_timestamp(_timescaledb_functions.cagg_watermark(299)), '-infinity'::timestamp with time zone))
=======
 SELECT _materialized_hypertable_83."timestamp",
    _materialized_hypertable_83.server_id,
    _materialized_hypertable_83.interface_name,
    _materialized_hypertable_83.netin,
    _materialized_hypertable_83.netout
   FROM _timescaledb_internal._materialized_hypertable_83
  WHERE (_materialized_hypertable_83."timestamp" < COALESCE(_timescaledb_functions.to_timestamp(_timescaledb_functions.cagg_watermark(83)), '-infinity'::timestamp with time zone))
>>>>>>> Stashed changes
UNION ALL
 SELECT public.time_bucket('7 days'::interval, server_network_stats.created_at) AS "timestamp",
    server_network_stats.server_id,
    server_network_stats.interface_name,
    avg(server_network_stats.rx_bytes) AS netin,
    avg(server_network_stats.tx_bytes) AS netout
   FROM public.server_network_stats
<<<<<<< Updated upstream
  WHERE (server_network_stats.created_at >= COALESCE(_timescaledb_functions.to_timestamp(_timescaledb_functions.cagg_watermark(299)), '-infinity'::timestamp with time zone))
=======
  WHERE (server_network_stats.created_at >= COALESCE(_timescaledb_functions.to_timestamp(_timescaledb_functions.cagg_watermark(83)), '-infinity'::timestamp with time zone))
>>>>>>> Stashed changes
  GROUP BY (public.time_bucket('7 days'::interval, server_network_stats.created_at)), server_network_stats.server_id, server_network_stats.interface_name;


--
-- Name: server_network_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.server_network_stats_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: server_network_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.server_network_stats_id_seq OWNED BY public.server_network_stats.id;


--
-- Name: server_updates_agg_day; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.server_updates_agg_day AS
<<<<<<< Updated upstream
 SELECT _materialized_hypertable_285."timestamp",
    _materialized_hypertable_285.server_id,
    _materialized_hypertable_285.cpu,
    _materialized_hypertable_285.memory,
    _materialized_hypertable_285.disk,
    _materialized_hypertable_285.netin,
    _materialized_hypertable_285.netout
   FROM _timescaledb_internal._materialized_hypertable_285
  WHERE (_materialized_hypertable_285."timestamp" < COALESCE(_timescaledb_functions.to_timestamp(_timescaledb_functions.cagg_watermark(285)), '-infinity'::timestamp with time zone))
=======
 SELECT _materialized_hypertable_76."timestamp",
    _materialized_hypertable_76.server_id,
    _materialized_hypertable_76.cpu,
    _materialized_hypertable_76.memory,
    _materialized_hypertable_76.disk,
    _materialized_hypertable_76.netin,
    _materialized_hypertable_76.netout
   FROM _timescaledb_internal._materialized_hypertable_76
  WHERE (_materialized_hypertable_76."timestamp" < COALESCE(_timescaledb_functions.to_timestamp(_timescaledb_functions.cagg_watermark(76)), '-infinity'::timestamp with time zone))
>>>>>>> Stashed changes
UNION ALL
 SELECT public.time_bucket('1 day'::interval, server_updates.created_at) AS "timestamp",
    server_updates.server_id,
    avg(server_updates.cpu_usage) AS cpu,
    avg(server_updates.memory_usage) AS memory,
    avg(server_updates.disk_usage) AS disk,
    avg(server_updates.network_rbytes) AS netin,
    avg(server_updates.network_tbytes) AS netout
   FROM public.server_updates
<<<<<<< Updated upstream
  WHERE (server_updates.created_at >= COALESCE(_timescaledb_functions.to_timestamp(_timescaledb_functions.cagg_watermark(285)), '-infinity'::timestamp with time zone))
=======
  WHERE (server_updates.created_at >= COALESCE(_timescaledb_functions.to_timestamp(_timescaledb_functions.cagg_watermark(76)), '-infinity'::timestamp with time zone))
>>>>>>> Stashed changes
  GROUP BY (public.time_bucket('1 day'::interval, server_updates.created_at)), server_updates.server_id;


--
-- Name: server_updates_agg_hour; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.server_updates_agg_hour AS
<<<<<<< Updated upstream
 SELECT _materialized_hypertable_283."timestamp",
    _materialized_hypertable_283.server_id,
    _materialized_hypertable_283.cpu,
    _materialized_hypertable_283.memory,
    _materialized_hypertable_283.disk,
    _materialized_hypertable_283.netin,
    _materialized_hypertable_283.netout
   FROM _timescaledb_internal._materialized_hypertable_283
  WHERE (_materialized_hypertable_283."timestamp" < COALESCE(_timescaledb_functions.to_timestamp(_timescaledb_functions.cagg_watermark(283)), '-infinity'::timestamp with time zone))
=======
 SELECT _materialized_hypertable_75."timestamp",
    _materialized_hypertable_75.server_id,
    _materialized_hypertable_75.cpu,
    _materialized_hypertable_75.memory,
    _materialized_hypertable_75.disk,
    _materialized_hypertable_75.netin,
    _materialized_hypertable_75.netout
   FROM _timescaledb_internal._materialized_hypertable_75
  WHERE (_materialized_hypertable_75."timestamp" < COALESCE(_timescaledb_functions.to_timestamp(_timescaledb_functions.cagg_watermark(75)), '-infinity'::timestamp with time zone))
>>>>>>> Stashed changes
UNION ALL
 SELECT public.time_bucket('01:00:00'::interval, server_updates.created_at) AS "timestamp",
    server_updates.server_id,
    avg(server_updates.cpu_usage) AS cpu,
    avg(server_updates.memory_usage) AS memory,
    avg(server_updates.disk_usage) AS disk,
    avg(server_updates.network_rbytes) AS netin,
    avg(server_updates.network_tbytes) AS netout
   FROM public.server_updates
<<<<<<< Updated upstream
  WHERE (server_updates.created_at >= COALESCE(_timescaledb_functions.to_timestamp(_timescaledb_functions.cagg_watermark(283)), '-infinity'::timestamp with time zone))
=======
  WHERE (server_updates.created_at >= COALESCE(_timescaledb_functions.to_timestamp(_timescaledb_functions.cagg_watermark(75)), '-infinity'::timestamp with time zone))
>>>>>>> Stashed changes
  GROUP BY (public.time_bucket('01:00:00'::interval, server_updates.created_at)), server_updates.server_id;


--
-- Name: server_updates_agg_minute; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.server_updates_agg_minute AS
<<<<<<< Updated upstream
 SELECT _materialized_hypertable_281."timestamp",
    _materialized_hypertable_281.server_id,
    _materialized_hypertable_281.cpu,
    _materialized_hypertable_281.memory,
    _materialized_hypertable_281.disk,
    _materialized_hypertable_281.netin,
    _materialized_hypertable_281.netout
   FROM _timescaledb_internal._materialized_hypertable_281
  WHERE (_materialized_hypertable_281."timestamp" < COALESCE(_timescaledb_functions.to_timestamp(_timescaledb_functions.cagg_watermark(281)), '-infinity'::timestamp with time zone))
=======
 SELECT _materialized_hypertable_74."timestamp",
    _materialized_hypertable_74.server_id,
    _materialized_hypertable_74.cpu,
    _materialized_hypertable_74.memory,
    _materialized_hypertable_74.disk,
    _materialized_hypertable_74.netin,
    _materialized_hypertable_74.netout
   FROM _timescaledb_internal._materialized_hypertable_74
  WHERE (_materialized_hypertable_74."timestamp" < COALESCE(_timescaledb_functions.to_timestamp(_timescaledb_functions.cagg_watermark(74)), '-infinity'::timestamp with time zone))
>>>>>>> Stashed changes
UNION ALL
 SELECT public.time_bucket('00:01:00'::interval, server_updates.created_at) AS "timestamp",
    server_updates.server_id,
    avg(server_updates.cpu_usage) AS cpu,
    avg(server_updates.memory_usage) AS memory,
    avg(server_updates.disk_usage) AS disk,
    avg(server_updates.network_rbytes) AS netin,
    avg(server_updates.network_tbytes) AS netout
   FROM public.server_updates
<<<<<<< Updated upstream
  WHERE (server_updates.created_at >= COALESCE(_timescaledb_functions.to_timestamp(_timescaledb_functions.cagg_watermark(281)), '-infinity'::timestamp with time zone))
=======
  WHERE (server_updates.created_at >= COALESCE(_timescaledb_functions.to_timestamp(_timescaledb_functions.cagg_watermark(74)), '-infinity'::timestamp with time zone))
>>>>>>> Stashed changes
  GROUP BY (public.time_bucket('00:01:00'::interval, server_updates.created_at)), server_updates.server_id;


--
-- Name: server_updates_agg_month; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.server_updates_agg_month AS
 SELECT "timestamp",
    server_id,
    cpu,
    memory,
    disk,
    netin,
    netout
<<<<<<< Updated upstream
   FROM _timescaledb_internal._materialized_hypertable_289;
=======
   FROM _timescaledb_internal._materialized_hypertable_78;
>>>>>>> Stashed changes


--
-- Name: server_updates_agg_week; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.server_updates_agg_week AS
 SELECT "timestamp",
    server_id,
    cpu,
    memory,
    disk,
    netin,
    netout
<<<<<<< Updated upstream
   FROM _timescaledb_internal._materialized_hypertable_287;
=======
   FROM _timescaledb_internal._materialized_hypertable_77;
>>>>>>> Stashed changes


--
-- Name: server_updates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.server_updates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: server_updates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.server_updates_id_seq OWNED BY public.server_updates.id;


--
-- Name: servers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.servers (
    id bigint NOT NULL,
    uuid uuid NOT NULL,
    client_id bigint NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    host_name character varying(255) NOT NULL,
    cpu_model character varying(255),
    cpu_cores integer,
    ram character varying(255),
    disk character varying(255),
    operating_system character varying(255),
    record_status character varying(255) DEFAULT 'active'::character varying NOT NULL,
    alert_scope character varying(255) DEFAULT 'client'::character varying NOT NULL,
    subscription_fee numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    agent_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    environment character varying(255),
    status character varying(255) DEFAULT 'pending_installation'::character varying NOT NULL,
    architecture character varying(255),
    archived_at timestamp(0) without time zone,
    online_seconds bigint DEFAULT '0'::bigint NOT NULL,
    went_offline_at timestamp(0) without time zone,
    deleted_at timestamp(0) without time zone,
    agent_id bigint,
    port_filter json,
    process_filter json,
    network_filter json
);


--
-- Name: servers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.servers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: servers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.servers_id_seq OWNED BY public.servers.id;


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id bigint NOT NULL,
    agent_id bigint NOT NULL,
    identifier character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    state character varying(255) NOT NULL,
    status character varying(255),
    last_seen timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: services_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.services_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.services_id_seq OWNED BY public.services.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id character varying(255) NOT NULL,
    user_id bigint,
    ip_address character varying(45),
    user_agent text,
    payload text NOT NULL,
    last_activity integer NOT NULL
);


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    id bigint NOT NULL,
    key character varying(255) NOT NULL,
    value text,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.settings_id_seq OWNED BY public.settings.id;


--
-- Name: telescope_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telescope_entries (
    sequence bigint NOT NULL,
    uuid uuid NOT NULL,
    batch_id uuid NOT NULL,
    family_hash character varying(255),
    should_display_on_index boolean DEFAULT true NOT NULL,
    type character varying(20) NOT NULL,
    content text NOT NULL,
    created_at timestamp(0) without time zone
);


--
-- Name: telescope_entries_sequence_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.telescope_entries_sequence_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: telescope_entries_sequence_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.telescope_entries_sequence_seq OWNED BY public.telescope_entries.sequence;


--
-- Name: telescope_entries_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telescope_entries_tags (
    entry_uuid uuid NOT NULL,
    tag character varying(255) NOT NULL
);


--
-- Name: telescope_monitoring; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telescope_monitoring (
    tag character varying(255) NOT NULL
);


--
-- Name: upload_intents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.upload_intents (
    id uuid NOT NULL,
    user_id bigint NOT NULL,
    purpose character varying(255) NOT NULL,
    storage_provider character varying(255) NOT NULL,
    storage_key character varying(255) NOT NULL,
    status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    attached_to_type character varying(255),
    attached_to_id bigint,
    attached_at timestamp(0) without time zone,
    expires_at timestamp(0) without time zone,
    metadata json,
    provider_response json,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    session_uuid uuid NOT NULL,
    refresh_token_id character varying(64) NOT NULL,
    refresh_token_hash character varying(64) NOT NULL,
    previous_refresh_token_id character varying(64),
    previous_refresh_token_hash character varying(64),
    remember_me boolean DEFAULT false NOT NULL,
    host_name character varying(255),
    device_type character varying(255),
    browser character varying(255),
    operating_system character varying(255),
    user_agent text,
    ip_address character varying(45),
    last_activity_at timestamp(0) without time zone,
    last_refresh_at timestamp(0) without time zone,
    expires_at timestamp(0) without time zone,
    revoked_at timestamp(0) without time zone,
    compromised_at timestamp(0) without time zone,
    compromise_reason character varying(255),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: user_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_sessions_id_seq OWNED BY public.user_sessions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    uuid uuid NOT NULL,
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    phone_number character varying(255) NOT NULL,
    username character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    last_login timestamp(0) without time zone,
    profile_picture_url text DEFAULT 'https://imgs.search.brave.com/qiHmz1d0zC7mZVMpYv076NCRzIT-VJP6ZGSd-3B0aaM/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9zdGF0/aWMudmVjdGVlenku/Y29tL3N5c3RlbS9y/ZXNvdXJjZXMvdGh1/bWJuYWlscy8wMjUv/MzM3LzY2OS9zbWFs/bC9kZWZhdWx0LW1h/bGUtYXZhdGFyLXBy/b2ZpbGUtaWNvbi1z/b2NpYWwtbWVkaWEt/Y2hhdHRpbmctb25s/aW5lLXVzZXItZnJl/ZS12ZWN0b3IuanBn'::text NOT NULL,
    record_status character varying(255) DEFAULT 'active'::character varying NOT NULL,
    remember_token character varying(100),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    profile_picture_public_id character varying(255),
    profile_picture_storage_key character varying(255),
    timezone character varying(64)
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: action_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_items ALTER COLUMN id SET DEFAULT nextval('public.action_items_id_seq'::regclass);


--
-- Name: activities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities ALTER COLUMN id SET DEFAULT nextval('public.activities_id_seq'::regclass);


--
-- Name: activity_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs ALTER COLUMN id SET DEFAULT nextval('public.activity_logs_id_seq'::regclass);


--
-- Name: agent_challenges id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_challenges ALTER COLUMN id SET DEFAULT nextval('public.agent_challenges_id_seq'::regclass);


--
-- Name: agent_commands id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_commands ALTER COLUMN id SET DEFAULT nextval('public.agent_commands_id_seq'::regclass);


--
-- Name: agent_configurations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_configurations ALTER COLUMN id SET DEFAULT nextval('public.agent_configurations_id_seq'::regclass);


--
-- Name: agent_identities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_identities ALTER COLUMN id SET DEFAULT nextval('public.agent_identities_id_seq'::regclass);


--
-- Name: agent_installations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_installations ALTER COLUMN id SET DEFAULT nextval('public.agent_installations_id_seq'::regclass);


--
-- Name: agent_versions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_versions ALTER COLUMN id SET DEFAULT nextval('public.agent_versions_id_seq'::regclass);


--
-- Name: agents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents ALTER COLUMN id SET DEFAULT nextval('public.agents_id_seq'::regclass);


--
-- Name: auth_audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.auth_audit_logs_id_seq'::regclass);


--
-- Name: client_alerts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_alerts ALTER COLUMN id SET DEFAULT nextval('public.client_alerts_id_seq'::regclass);


--
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- Name: command_results id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.command_results ALTER COLUMN id SET DEFAULT nextval('public.command_results_id_seq'::regclass);


--
-- Name: configuration_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuration_history ALTER COLUMN id SET DEFAULT nextval('public.configuration_history_id_seq'::regclass);


--
-- Name: failed_jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_jobs ALTER COLUMN id SET DEFAULT nextval('public.failed_jobs_id_seq'::regclass);


--
-- Name: global_alerts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_alerts ALTER COLUMN id SET DEFAULT nextval('public.global_alerts_id_seq'::regclass);


--
-- Name: heartbeats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.heartbeats ALTER COLUMN id SET DEFAULT nextval('public.heartbeats_id_seq'::regclass);


--
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);


--
-- Name: local_alerts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.local_alerts ALTER COLUMN id SET DEFAULT nextval('public.local_alerts_id_seq'::regclass);


--
-- Name: metric_batches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metric_batches ALTER COLUMN id SET DEFAULT nextval('public.metric_batches_id_seq'::regclass);


--
-- Name: metric_samples id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metric_samples ALTER COLUMN id SET DEFAULT nextval('public.metric_samples_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: node_config_states id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.node_config_states ALTER COLUMN id SET DEFAULT nextval('public.node_config_states_id_seq'::regclass);


--
-- Name: node_configs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.node_configs ALTER COLUMN id SET DEFAULT nextval('public.node_configs_id_seq'::regclass);


--
-- Name: personal_access_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_access_tokens ALTER COLUMN id SET DEFAULT nextval('public.personal_access_tokens_id_seq'::regclass);


--
-- Name: ports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ports ALTER COLUMN id SET DEFAULT nextval('public.ports_id_seq'::regclass);


--
-- Name: processes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processes ALTER COLUMN id SET DEFAULT nextval('public.processes_id_seq'::regclass);


--
-- Name: provision_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provision_tokens ALTER COLUMN id SET DEFAULT nextval('public.provision_tokens_id_seq'::regclass);


--
-- Name: refresh_token_rotations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_token_rotations ALTER COLUMN id SET DEFAULT nextval('public.refresh_token_rotations_id_seq'::regclass);


--
-- Name: server_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.server_logs ALTER COLUMN id SET DEFAULT nextval('public.server_logs_id_seq'::regclass);


--
-- Name: server_network_stats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.server_network_stats ALTER COLUMN id SET DEFAULT nextval('public.server_network_stats_id_seq'::regclass);


--
-- Name: server_updates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.server_updates ALTER COLUMN id SET DEFAULT nextval('public.server_updates_id_seq'::regclass);


--
-- Name: servers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servers ALTER COLUMN id SET DEFAULT nextval('public.servers_id_seq'::regclass);


--
-- Name: services id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services ALTER COLUMN id SET DEFAULT nextval('public.services_id_seq'::regclass);


--
-- Name: settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings ALTER COLUMN id SET DEFAULT nextval('public.settings_id_seq'::regclass);


--
-- Name: telescope_entries sequence; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telescope_entries ALTER COLUMN sequence SET DEFAULT nextval('public.telescope_entries_sequence_seq'::regclass);


--
-- Name: user_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions ALTER COLUMN id SET DEFAULT nextval('public.user_sessions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: action_items action_items_action_type_server_id_client_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_items
    ADD CONSTRAINT action_items_action_type_server_id_client_id_unique UNIQUE (action_type, server_id, client_id);


--
-- Name: action_items action_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_items
    ADD CONSTRAINT action_items_pkey PRIMARY KEY (id);


--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: agent_challenges agent_challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_challenges
    ADD CONSTRAINT agent_challenges_pkey PRIMARY KEY (id);


--
-- Name: agent_commands agent_commands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_commands
    ADD CONSTRAINT agent_commands_pkey PRIMARY KEY (id);


--
-- Name: agent_configurations agent_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_configurations
    ADD CONSTRAINT agent_configurations_pkey PRIMARY KEY (id);


--
-- Name: agent_identities agent_identities_identity_hash_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_identities
    ADD CONSTRAINT agent_identities_identity_hash_unique UNIQUE (identity_hash);


--
-- Name: agent_identities agent_identities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_identities
    ADD CONSTRAINT agent_identities_pkey PRIMARY KEY (id);


--
-- Name: agent_installations agent_installations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_installations
    ADD CONSTRAINT agent_installations_pkey PRIMARY KEY (id);


--
-- Name: agent_versions agent_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_versions
    ADD CONSTRAINT agent_versions_pkey PRIMARY KEY (id);


--
-- Name: agent_versions agent_versions_version_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_versions
    ADD CONSTRAINT agent_versions_version_unique UNIQUE (version);


--
-- Name: agents agents_installation_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_installation_uuid_unique UNIQUE (installation_uuid);


--
-- Name: agents agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_pkey PRIMARY KEY (id);


--
-- Name: auth_audit_logs auth_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_audit_logs
    ADD CONSTRAINT auth_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: cache_locks cache_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_locks
    ADD CONSTRAINT cache_locks_pkey PRIMARY KEY (key);


--
-- Name: cache cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache
    ADD CONSTRAINT cache_pkey PRIMARY KEY (key);


--
-- Name: client_alerts client_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_alerts
    ADD CONSTRAINT client_alerts_pkey PRIMARY KEY (id);


--
-- Name: clients clients_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_email_unique UNIQUE (email);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: clients clients_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_uuid_unique UNIQUE (uuid);


--
-- Name: command_results command_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.command_results
    ADD CONSTRAINT command_results_pkey PRIMARY KEY (id);


--
-- Name: configuration_history configuration_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuration_history
    ADD CONSTRAINT configuration_history_pkey PRIMARY KEY (id);


--
-- Name: failed_jobs failed_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_pkey PRIMARY KEY (id);


--
-- Name: failed_jobs failed_jobs_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_uuid_unique UNIQUE (uuid);


--
-- Name: global_alerts global_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.global_alerts
    ADD CONSTRAINT global_alerts_pkey PRIMARY KEY (id);


--
-- Name: heartbeats heartbeats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.heartbeats
    ADD CONSTRAINT heartbeats_pkey PRIMARY KEY (id);


--
-- Name: job_batches job_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_batches
    ADD CONSTRAINT job_batches_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: local_alerts local_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.local_alerts
    ADD CONSTRAINT local_alerts_pkey PRIMARY KEY (id);


--
-- Name: metric_batches metric_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metric_batches
    ADD CONSTRAINT metric_batches_pkey PRIMARY KEY (id);


--
-- Name: metric_samples metric_samples_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metric_samples
    ADD CONSTRAINT metric_samples_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: node_config_states node_config_states_node_config_id_node_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.node_config_states
    ADD CONSTRAINT node_config_states_node_config_id_node_id_unique UNIQUE (node_config_id, node_id);


--
-- Name: node_config_states node_config_states_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.node_config_states
    ADD CONSTRAINT node_config_states_pkey PRIMARY KEY (id);


--
-- Name: node_configs node_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.node_configs
    ADD CONSTRAINT node_configs_pkey PRIMARY KEY (id);


--
-- Name: node_configs node_configs_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.node_configs
    ADD CONSTRAINT node_configs_slug_unique UNIQUE (slug);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (email);


--
-- Name: personal_access_tokens personal_access_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_access_tokens
    ADD CONSTRAINT personal_access_tokens_pkey PRIMARY KEY (id);


--
-- Name: personal_access_tokens personal_access_tokens_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_access_tokens
    ADD CONSTRAINT personal_access_tokens_token_unique UNIQUE (token);


--
-- Name: ports ports_agent_id_protocol_port_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ports
    ADD CONSTRAINT ports_agent_id_protocol_port_unique UNIQUE (agent_id, protocol, port);


--
-- Name: ports ports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ports
    ADD CONSTRAINT ports_pkey PRIMARY KEY (id);


--
-- Name: processes processes_agent_id_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processes
    ADD CONSTRAINT processes_agent_id_name_unique UNIQUE (agent_id, name);


--
-- Name: processes processes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processes
    ADD CONSTRAINT processes_pkey PRIMARY KEY (id);


--
-- Name: provision_tokens provision_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provision_tokens
    ADD CONSTRAINT provision_tokens_pkey PRIMARY KEY (id);


--
-- Name: provision_tokens provision_tokens_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provision_tokens
    ADD CONSTRAINT provision_tokens_token_unique UNIQUE (token);


--
-- Name: refresh_token_rotations refresh_token_rotations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_token_rotations
    ADD CONSTRAINT refresh_token_rotations_pkey PRIMARY KEY (id);


--
-- Name: sec_op_clients sec_op_clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sec_op_clients
    ADD CONSTRAINT sec_op_clients_pkey PRIMARY KEY (uuid);


--
-- Name: server_logs server_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.server_logs
    ADD CONSTRAINT server_logs_pkey PRIMARY KEY (id);


--
-- Name: server_network_stats server_network_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.server_network_stats
    ADD CONSTRAINT server_network_stats_pkey PRIMARY KEY (id, created_at);


--
-- Name: server_updates server_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.server_updates
    ADD CONSTRAINT server_updates_pkey PRIMARY KEY (id, created_at);


--
-- Name: servers servers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servers
    ADD CONSTRAINT servers_pkey PRIMARY KEY (id);


--
-- Name: servers servers_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servers
    ADD CONSTRAINT servers_uuid_unique UNIQUE (uuid);


--
-- Name: services services_agent_id_identifier_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_agent_id_identifier_unique UNIQUE (agent_id, identifier);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: settings settings_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_key_unique UNIQUE (key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: telescope_entries telescope_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telescope_entries
    ADD CONSTRAINT telescope_entries_pkey PRIMARY KEY (sequence);


--
-- Name: telescope_entries_tags telescope_entries_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telescope_entries_tags
    ADD CONSTRAINT telescope_entries_tags_pkey PRIMARY KEY (entry_uuid, tag);


--
-- Name: telescope_entries telescope_entries_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telescope_entries
    ADD CONSTRAINT telescope_entries_uuid_unique UNIQUE (uuid);


--
-- Name: telescope_monitoring telescope_monitoring_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telescope_monitoring
    ADD CONSTRAINT telescope_monitoring_pkey PRIMARY KEY (tag);


--
-- Name: upload_intents upload_intents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upload_intents
    ADD CONSTRAINT upload_intents_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_refresh_token_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_refresh_token_id_unique UNIQUE (refresh_token_id);


--
-- Name: user_sessions user_sessions_session_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_session_uuid_unique UNIQUE (session_uuid);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: users users_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_uuid_unique UNIQUE (uuid);


--
<<<<<<< Updated upstream
-- Name: _materialized_hypertable_281_timestamp_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

CREATE INDEX _materialized_hypertable_281_timestamp_idx ON _timescaledb_internal._materialized_hypertable_281 USING btree ("timestamp" DESC);


--
-- Name: _materialized_hypertable_283_timestamp_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

CREATE INDEX _materialized_hypertable_283_timestamp_idx ON _timescaledb_internal._materialized_hypertable_283 USING btree ("timestamp" DESC);


--
-- Name: _materialized_hypertable_285_timestamp_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

CREATE INDEX _materialized_hypertable_285_timestamp_idx ON _timescaledb_internal._materialized_hypertable_285 USING btree ("timestamp" DESC);


--
-- Name: _materialized_hypertable_287_timestamp_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

CREATE INDEX _materialized_hypertable_287_timestamp_idx ON _timescaledb_internal._materialized_hypertable_287 USING btree ("timestamp" DESC);


--
-- Name: _materialized_hypertable_289_timestamp_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

CREATE INDEX _materialized_hypertable_289_timestamp_idx ON _timescaledb_internal._materialized_hypertable_289 USING btree ("timestamp" DESC);


--
-- Name: _materialized_hypertable_293_timestamp_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

CREATE INDEX _materialized_hypertable_293_timestamp_idx ON _timescaledb_internal._materialized_hypertable_293 USING btree ("timestamp" DESC);


--
-- Name: _materialized_hypertable_295_timestamp_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

CREATE INDEX _materialized_hypertable_295_timestamp_idx ON _timescaledb_internal._materialized_hypertable_295 USING btree ("timestamp" DESC);


--
-- Name: _materialized_hypertable_297_timestamp_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

CREATE INDEX _materialized_hypertable_297_timestamp_idx ON _timescaledb_internal._materialized_hypertable_297 USING btree ("timestamp" DESC);


--
-- Name: _materialized_hypertable_299_timestamp_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

CREATE INDEX _materialized_hypertable_299_timestamp_idx ON _timescaledb_internal._materialized_hypertable_299 USING btree ("timestamp" DESC);


--
-- Name: _materialized_hypertable_301_timestamp_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

CREATE INDEX _materialized_hypertable_301_timestamp_idx ON _timescaledb_internal._materialized_hypertable_301 USING btree ("timestamp" DESC);


--
-- Name: compress_hyper_202_27_chunk__ts_meta_v2_first_timestamp__ts_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

CREATE INDEX compress_hyper_202_27_chunk__ts_meta_v2_first_timestamp__ts_idx ON _timescaledb_internal.compress_hyper_202_27_chunk USING btree (_ts_meta_v2_first_timestamp, _ts_meta_v2_last_timestamp, _ts_meta_v2_first_server_id, _ts_meta_v2_last_server_id);
=======
-- Name: _materialized_hypertable_74_timestamp_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

CREATE INDEX _materialized_hypertable_74_timestamp_idx ON _timescaledb_internal._materialized_hypertable_74 USING btree ("timestamp" DESC);


--
-- Name: _materialized_hypertable_75_timestamp_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

CREATE INDEX _materialized_hypertable_75_timestamp_idx ON _timescaledb_internal._materialized_hypertable_75 USING btree ("timestamp" DESC);


--
-- Name: _materialized_hypertable_76_timestamp_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

CREATE INDEX _materialized_hypertable_76_timestamp_idx ON _timescaledb_internal._materialized_hypertable_76 USING btree ("timestamp" DESC);


--
-- Name: _materialized_hypertable_77_timestamp_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

CREATE INDEX _materialized_hypertable_77_timestamp_idx ON _timescaledb_internal._materialized_hypertable_77 USING btree ("timestamp" DESC);


--
-- Name: _materialized_hypertable_78_timestamp_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

CREATE INDEX _materialized_hypertable_78_timestamp_idx ON _timescaledb_internal._materialized_hypertable_78 USING btree ("timestamp" DESC);


--
-- Name: _materialized_hypertable_80_timestamp_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

CREATE INDEX _materialized_hypertable_80_timestamp_idx ON _timescaledb_internal._materialized_hypertable_80 USING btree ("timestamp" DESC);


--
-- Name: _materialized_hypertable_81_timestamp_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

CREATE INDEX _materialized_hypertable_81_timestamp_idx ON _timescaledb_internal._materialized_hypertable_81 USING btree ("timestamp" DESC);


--
-- Name: _materialized_hypertable_82_timestamp_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

CREATE INDEX _materialized_hypertable_82_timestamp_idx ON _timescaledb_internal._materialized_hypertable_82 USING btree ("timestamp" DESC);


--
-- Name: _materialized_hypertable_83_timestamp_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

CREATE INDEX _materialized_hypertable_83_timestamp_idx ON _timescaledb_internal._materialized_hypertable_83 USING btree ("timestamp" DESC);


--
-- Name: _materialized_hypertable_84_timestamp_idx; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

CREATE INDEX _materialized_hypertable_84_timestamp_idx ON _timescaledb_internal._materialized_hypertable_84 USING btree ("timestamp" DESC);
>>>>>>> Stashed changes


--
-- Name: server_network_stats_agg_day_server_id_interface_name_timestamp; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

<<<<<<< Updated upstream
CREATE INDEX server_network_stats_agg_day_server_id_interface_name_timestamp ON _timescaledb_internal._materialized_hypertable_297 USING btree (server_id, interface_name, "timestamp");
=======
CREATE INDEX server_network_stats_agg_day_server_id_interface_name_timestamp ON _timescaledb_internal._materialized_hypertable_82 USING btree (server_id, interface_name, "timestamp");
>>>>>>> Stashed changes


--
-- Name: server_network_stats_agg_hour_server_id_interface_name_timestam; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

<<<<<<< Updated upstream
CREATE INDEX server_network_stats_agg_hour_server_id_interface_name_timestam ON _timescaledb_internal._materialized_hypertable_295 USING btree (server_id, interface_name, "timestamp");
=======
CREATE INDEX server_network_stats_agg_hour_server_id_interface_name_timestam ON _timescaledb_internal._materialized_hypertable_81 USING btree (server_id, interface_name, "timestamp");
>>>>>>> Stashed changes


--
-- Name: server_network_stats_agg_minute_server_id_interface_name_timest; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

<<<<<<< Updated upstream
CREATE INDEX server_network_stats_agg_minute_server_id_interface_name_timest ON _timescaledb_internal._materialized_hypertable_293 USING btree (server_id, interface_name, "timestamp");
=======
CREATE INDEX server_network_stats_agg_minute_server_id_interface_name_timest ON _timescaledb_internal._materialized_hypertable_80 USING btree (server_id, interface_name, "timestamp");
>>>>>>> Stashed changes


--
-- Name: server_network_stats_agg_month_server_id_interface_name_timesta; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

<<<<<<< Updated upstream
CREATE INDEX server_network_stats_agg_month_server_id_interface_name_timesta ON _timescaledb_internal._materialized_hypertable_301 USING btree (server_id, interface_name, "timestamp");
=======
CREATE INDEX server_network_stats_agg_month_server_id_interface_name_timesta ON _timescaledb_internal._materialized_hypertable_84 USING btree (server_id, interface_name, "timestamp");
>>>>>>> Stashed changes


--
-- Name: server_network_stats_agg_week_server_id_interface_name_timestam; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

<<<<<<< Updated upstream
CREATE INDEX server_network_stats_agg_week_server_id_interface_name_timestam ON _timescaledb_internal._materialized_hypertable_299 USING btree (server_id, interface_name, "timestamp");
=======
CREATE INDEX server_network_stats_agg_week_server_id_interface_name_timestam ON _timescaledb_internal._materialized_hypertable_83 USING btree (server_id, interface_name, "timestamp");
>>>>>>> Stashed changes


--
-- Name: server_updates_agg_day_server_id_timestamp_index; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

<<<<<<< Updated upstream
CREATE INDEX server_updates_agg_day_server_id_timestamp_index ON _timescaledb_internal._materialized_hypertable_285 USING btree (server_id, "timestamp");
=======
CREATE INDEX server_updates_agg_day_server_id_timestamp_index ON _timescaledb_internal._materialized_hypertable_76 USING btree (server_id, "timestamp");
>>>>>>> Stashed changes


--
-- Name: server_updates_agg_hour_server_id_timestamp_index; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

<<<<<<< Updated upstream
CREATE INDEX server_updates_agg_hour_server_id_timestamp_index ON _timescaledb_internal._materialized_hypertable_283 USING btree (server_id, "timestamp");
=======
CREATE INDEX server_updates_agg_hour_server_id_timestamp_index ON _timescaledb_internal._materialized_hypertable_75 USING btree (server_id, "timestamp");
>>>>>>> Stashed changes


--
-- Name: server_updates_agg_minute_server_id_timestamp_index; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

<<<<<<< Updated upstream
CREATE INDEX server_updates_agg_minute_server_id_timestamp_index ON _timescaledb_internal._materialized_hypertable_281 USING btree (server_id, "timestamp");
=======
CREATE INDEX server_updates_agg_minute_server_id_timestamp_index ON _timescaledb_internal._materialized_hypertable_74 USING btree (server_id, "timestamp");
>>>>>>> Stashed changes


--
-- Name: server_updates_agg_month_server_id_timestamp_index; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

<<<<<<< Updated upstream
CREATE INDEX server_updates_agg_month_server_id_timestamp_index ON _timescaledb_internal._materialized_hypertable_289 USING btree (server_id, "timestamp");
=======
CREATE INDEX server_updates_agg_month_server_id_timestamp_index ON _timescaledb_internal._materialized_hypertable_78 USING btree (server_id, "timestamp");
>>>>>>> Stashed changes


--
-- Name: server_updates_agg_week_server_id_timestamp_index; Type: INDEX; Schema: _timescaledb_internal; Owner: -
--

<<<<<<< Updated upstream
CREATE INDEX server_updates_agg_week_server_id_timestamp_index ON _timescaledb_internal._materialized_hypertable_287 USING btree (server_id, "timestamp");
=======
CREATE INDEX server_updates_agg_week_server_id_timestamp_index ON _timescaledb_internal._materialized_hypertable_77 USING btree (server_id, "timestamp");
>>>>>>> Stashed changes


--
-- Name: activities_created_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activities_created_at_index ON public.activities USING btree (created_at);


--
-- Name: activities_server_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activities_server_id_index ON public.activities USING btree (server_id);


--
-- Name: activity_logs_type_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX activity_logs_type_index ON public.activity_logs USING btree (type);


--
-- Name: agent_challenges_status_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX agent_challenges_status_index ON public.agent_challenges USING btree (status);


--
-- Name: agent_commands_status_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX agent_commands_status_index ON public.agent_commands USING btree (status);


--
-- Name: agent_identities_identity_hash_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX agent_identities_identity_hash_index ON public.agent_identities USING btree (identity_hash);


--
-- Name: auth_audit_logs_created_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_audit_logs_created_at_index ON public.auth_audit_logs USING btree (created_at);


--
-- Name: auth_audit_logs_event_type_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_audit_logs_event_type_index ON public.auth_audit_logs USING btree (event_type);


--
-- Name: auth_audit_logs_session_uuid_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_audit_logs_session_uuid_index ON public.auth_audit_logs USING btree (session_uuid);


--
-- Name: auth_audit_logs_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_audit_logs_user_id_index ON public.auth_audit_logs USING btree (user_id);


--
-- Name: cache_expiration_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cache_expiration_index ON public.cache USING btree (expiration);


--
-- Name: cache_locks_expiration_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cache_locks_expiration_index ON public.cache_locks USING btree (expiration);


--
-- Name: failed_jobs_connection_queue_failed_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX failed_jobs_connection_queue_failed_at_index ON public.failed_jobs USING btree (connection, queue, failed_at);


--
-- Name: heartbeats_agent_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX heartbeats_agent_id_index ON public.heartbeats USING btree (agent_id);


--
-- Name: heartbeats_received_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX heartbeats_received_at_index ON public.heartbeats USING btree (received_at);


--
-- Name: jobs_queue_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX jobs_queue_index ON public.jobs USING btree (queue);


--
-- Name: metric_samples_metric_type_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX metric_samples_metric_type_index ON public.metric_samples USING btree (metric_type);


--
-- Name: metric_samples_recorded_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX metric_samples_recorded_at_index ON public.metric_samples USING btree (recorded_at);


--
-- Name: node_config_states_node_config_id_server_id_node_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX node_config_states_node_config_id_server_id_node_id_index ON public.node_config_states USING btree (node_config_id, server_id, node_id);


--
-- Name: node_configs_scope_type_scope_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX node_configs_scope_type_scope_id_index ON public.node_configs USING btree (scope_type, scope_id);


--
-- Name: personal_access_tokens_expires_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX personal_access_tokens_expires_at_index ON public.personal_access_tokens USING btree (expires_at);


--
-- Name: personal_access_tokens_tokenable_type_tokenable_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX personal_access_tokens_tokenable_type_tokenable_id_index ON public.personal_access_tokens USING btree (tokenable_type, tokenable_id);


--
-- Name: provision_tokens_token_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX provision_tokens_token_index ON public.provision_tokens USING btree (token);


--
-- Name: refresh_token_rotations_refresh_token_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refresh_token_rotations_refresh_token_id_index ON public.refresh_token_rotations USING btree (refresh_token_id);


--
-- Name: refresh_token_rotations_session_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refresh_token_rotations_session_id_index ON public.refresh_token_rotations USING btree (session_id);


--
-- Name: server_network_stats_server_id_interface_name_created_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX server_network_stats_server_id_interface_name_created_at_index ON public.server_network_stats USING btree (server_id, interface_name, created_at);


--
-- Name: server_updates_server_id_created_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX server_updates_server_id_created_at_index ON public.server_updates USING btree (server_id, created_at);


--
-- Name: servers_agent_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX servers_agent_id_index ON public.servers USING btree (agent_id);


--
-- Name: sessions_last_activity_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_last_activity_index ON public.sessions USING btree (last_activity);


--
-- Name: sessions_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_user_id_index ON public.sessions USING btree (user_id);


--
-- Name: telescope_entries_batch_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX telescope_entries_batch_id_index ON public.telescope_entries USING btree (batch_id);


--
-- Name: telescope_entries_created_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX telescope_entries_created_at_index ON public.telescope_entries USING btree (created_at);


--
-- Name: telescope_entries_family_hash_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX telescope_entries_family_hash_index ON public.telescope_entries USING btree (family_hash);


--
-- Name: telescope_entries_tags_tag_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX telescope_entries_tags_tag_index ON public.telescope_entries_tags USING btree (tag);


--
-- Name: telescope_entries_type_should_display_on_index_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX telescope_entries_type_should_display_on_index_index ON public.telescope_entries USING btree (type, should_display_on_index);


--
-- Name: upload_intents_attached_to_type_attached_to_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX upload_intents_attached_to_type_attached_to_id_index ON public.upload_intents USING btree (attached_to_type, attached_to_id);


--
-- Name: upload_intents_status_expires_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX upload_intents_status_expires_at_index ON public.upload_intents USING btree (status, expires_at);


--
-- Name: upload_intents_status_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX upload_intents_status_index ON public.upload_intents USING btree (status);


--
-- Name: upload_intents_user_id_status_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX upload_intents_user_id_status_index ON public.upload_intents USING btree (user_id, status);


--
-- Name: user_sessions_compromised_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_sessions_compromised_at_index ON public.user_sessions USING btree (compromised_at);


--
-- Name: user_sessions_expires_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_sessions_expires_at_index ON public.user_sessions USING btree (expires_at);


--
-- Name: user_sessions_refresh_token_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_sessions_refresh_token_id_index ON public.user_sessions USING btree (refresh_token_id);


--
-- Name: user_sessions_revoked_at_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_sessions_revoked_at_index ON public.user_sessions USING btree (revoked_at);


--
-- Name: user_sessions_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_sessions_user_id_index ON public.user_sessions USING btree (user_id);


--
-- Name: action_items action_items_assigned_to_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_items
    ADD CONSTRAINT action_items_assigned_to_foreign FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: action_items action_items_client_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_items
    ADD CONSTRAINT action_items_client_id_foreign FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: action_items action_items_server_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_items
    ADD CONSTRAINT action_items_server_id_foreign FOREIGN KEY (server_id) REFERENCES public.servers(id) ON DELETE SET NULL;


--
-- Name: activities activities_agent_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_agent_id_foreign FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: activities activities_performed_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_performed_by_foreign FOREIGN KEY (performed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: activities activities_server_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_server_id_foreign FOREIGN KEY (server_id) REFERENCES public.servers(id) ON DELETE CASCADE;


--
-- Name: activity_logs activity_logs_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: agent_challenges agent_challenges_agent_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_challenges
    ADD CONSTRAINT agent_challenges_agent_id_foreign FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agent_commands agent_commands_agent_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_commands
    ADD CONSTRAINT agent_commands_agent_id_foreign FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agent_configurations agent_configurations_agent_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_configurations
    ADD CONSTRAINT agent_configurations_agent_id_foreign FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agent_identities agent_identities_agent_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_identities
    ADD CONSTRAINT agent_identities_agent_id_foreign FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: agent_installations agent_installations_initiated_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_installations
    ADD CONSTRAINT agent_installations_initiated_by_foreign FOREIGN KEY (initiated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: agent_installations agent_installations_server_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_installations
    ADD CONSTRAINT agent_installations_server_id_foreign FOREIGN KEY (server_id) REFERENCES public.servers(id) ON DELETE CASCADE;


--
-- Name: agents agents_server_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_server_id_foreign FOREIGN KEY (server_id) REFERENCES public.servers(id) ON DELETE CASCADE;


--
-- Name: auth_audit_logs auth_audit_logs_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_audit_logs
    ADD CONSTRAINT auth_audit_logs_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: client_alerts client_alerts_client_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_alerts
    ADD CONSTRAINT client_alerts_client_id_foreign FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: command_results command_results_command_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.command_results
    ADD CONSTRAINT command_results_command_id_foreign FOREIGN KEY (command_id) REFERENCES public.agent_commands(id) ON DELETE CASCADE;


--
-- Name: configuration_history configuration_history_agent_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuration_history
    ADD CONSTRAINT configuration_history_agent_id_foreign FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: heartbeats heartbeats_agent_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.heartbeats
    ADD CONSTRAINT heartbeats_agent_id_foreign FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: local_alerts local_alerts_server_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.local_alerts
    ADD CONSTRAINT local_alerts_server_id_foreign FOREIGN KEY (server_id) REFERENCES public.servers(id);


--
-- Name: metric_batches metric_batches_agent_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metric_batches
    ADD CONSTRAINT metric_batches_agent_id_foreign FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: metric_batches metric_batches_heartbeat_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metric_batches
    ADD CONSTRAINT metric_batches_heartbeat_id_foreign FOREIGN KEY (heartbeat_id) REFERENCES public.heartbeats(id) ON DELETE SET NULL;


--
-- Name: metric_samples metric_samples_batch_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metric_samples
    ADD CONSTRAINT metric_samples_batch_id_foreign FOREIGN KEY (batch_id) REFERENCES public.metric_batches(id) ON DELETE CASCADE;


--
-- Name: node_config_states node_config_states_node_config_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.node_config_states
    ADD CONSTRAINT node_config_states_node_config_id_foreign FOREIGN KEY (node_config_id) REFERENCES public.node_configs(id) ON DELETE CASCADE;


--
-- Name: node_configs node_configs_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.node_configs
    ADD CONSTRAINT node_configs_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: ports ports_agent_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ports
    ADD CONSTRAINT ports_agent_id_foreign FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: processes processes_agent_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processes
    ADD CONSTRAINT processes_agent_id_foreign FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: provision_tokens provision_tokens_created_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provision_tokens
    ADD CONSTRAINT provision_tokens_created_by_foreign FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: provision_tokens provision_tokens_server_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provision_tokens
    ADD CONSTRAINT provision_tokens_server_id_foreign FOREIGN KEY (server_id) REFERENCES public.servers(id) ON DELETE CASCADE;


--
-- Name: refresh_token_rotations refresh_token_rotations_session_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_token_rotations
    ADD CONSTRAINT refresh_token_rotations_session_id_foreign FOREIGN KEY (session_id) REFERENCES public.user_sessions(id) ON DELETE CASCADE;


--
-- Name: sec_op_clients sec_op_clients_client_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sec_op_clients
    ADD CONSTRAINT sec_op_clients_client_id_foreign FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: sec_op_clients sec_op_clients_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sec_op_clients
    ADD CONSTRAINT sec_op_clients_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: server_logs server_logs_server_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.server_logs
    ADD CONSTRAINT server_logs_server_id_foreign FOREIGN KEY (server_id) REFERENCES public.servers(id);


--
-- Name: server_network_stats server_network_stats_server_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.server_network_stats
    ADD CONSTRAINT server_network_stats_server_id_foreign FOREIGN KEY (server_id) REFERENCES public.servers(id);


--
-- Name: server_updates server_updates_server_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.server_updates
    ADD CONSTRAINT server_updates_server_id_foreign FOREIGN KEY (server_id) REFERENCES public.servers(id) ON DELETE CASCADE;


--
-- Name: servers servers_agent_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servers
    ADD CONSTRAINT servers_agent_id_foreign FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: servers servers_client_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servers
    ADD CONSTRAINT servers_client_id_foreign FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: services services_agent_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_agent_id_foreign FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: telescope_entries_tags telescope_entries_tags_entry_uuid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telescope_entries_tags
    ADD CONSTRAINT telescope_entries_tags_entry_uuid_foreign FOREIGN KEY (entry_uuid) REFERENCES public.telescope_entries(uuid) ON DELETE CASCADE;


--
-- Name: upload_intents upload_intents_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upload_intents
    ADD CONSTRAINT upload_intents_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

<<<<<<< Updated upstream
\unrestrict 40SP2iiUa0SWwUvycrEkoMVB465f1od1peuRW8IvJKbHluB0UmZUS5lDfEDiMKn
=======
\unrestrict o9TERDHj1lbIt71dodprnIVigMMcC6UwJJNa9zMmtF705WaoQfhUA2Xmf2qjoWd
>>>>>>> Stashed changes

--
-- PostgreSQL database dump
--

<<<<<<< Updated upstream
\restrict 5HDfiM7evMgsCwKSn5iEl7vJfWzFRl0dvErrrDF3qH4fpPhQ4TGU8m0ttUKGJ2U
=======
\restrict ekEJOikXwfLd8UYHiet0VRPIFlqbUY4BztBdqDrD9BcnOEsEXHPmExC892Tk1vf
>>>>>>> Stashed changes

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.migrations (id, migration, batch) FROM stdin;
1	0001_01_01_000000_create_users_table	1
2	0001_01_01_000001_create_cache_table	1
3	0001_01_01_000002_create_jobs_table	1
4	2026_06_11_061126_create_clients_table	1
5	2026_06_11_062449_create_servers_table	1
6	2026_06_11_064926_create_activity_logs_table	1
7	2026_06_14_143709_create_personal_access_tokens_table	1
8	2026_06_15_051749_create_serverupdates_table	1
9	2026_06_18_065608_create_global_alerts_table	1
10	2026_06_18_073748_create_local_alerts_table	1
11	2026_06_22_042738_create_telescope_entries_table	1
12	2026_06_22_062500_create_action_items_table	1
13	2026_06_22_080000_add_cloudinary_public_ids	1
14	2026_06_22_084242_create_sec_op_clients_table	1
15	2026_06_23_000001_create_user_sessions_table	1
16	2026_06_23_000002_create_refresh_token_rotations_table	1
17	2026_06_23_000003_create_auth_audit_logs_table	1
18	2026_06_23_052329_create_server_logs_table	1
19	2026_06_26_000001_create_upload_intents_table	1
20	2026_06_26_000002_add_storage_keys_to_users_and_clients	1
21	2026_06_27_000001_create_settings_table	1
22	2026_06_29_000001_remove_roles	1
23	2026_06_30_055605_create_client_alerts_table	1
24	2026_07_07_000001_create_node_configs_table	1
25	2026_07_08_000001_update_servers_table_for_agent_refactor	1
26	2026_07_08_000002_create_agent_architecture_tables	1
27	2026_07_10_000001_add_slug_to_node_configs_table	1
28	2026_07_10_000002_add_compiled_config_to_node_configs_table	1
29	2026_07_13_075046_add_ping_to_ports_table	1
30	2026_07_14_000001_add_scope_to_node_configs_table	1
31	2026_07_20_000001_add_code_columns_to_password_reset_tokens	1
32	2026_07_21_000001_add_costing_to_servers_table	1
33	2026_07_21_000002_add_online_seconds_to_servers_table	1
34	2026_07_21_000003_add_historical_cost_to_servers_table	1
35	2026_07_21_000004_add_accumulated_cost_to_servers_table	1
36	2026_07_23_075949_add_pending_monthly_cost_to_servers_table	1
37	2026_07_24_000001_add_went_offline_at_to_servers_table	1
38	2026_07_24_085111_add_server_id_to_node_config_states_table	1
39	2026_07_28_000001_create_server_health_and_agent_logs_tables	1
40	2026_07_28_000002_rename_hourly_cost_to_monthly_cost_in_servers_table	1
41	2026_08_03_000001_increase_servers_cost_columns_precision	1
42	2026_08_03_000002_add_soft_deletes_to_servers_table	1
43	2026_08_04_000001_add_timezone_to_users_table	1
44	2026_08_04_060037_drop_billing_columns_from_servers_table	1
45	2026_08_11_235112_change_servers_alert_scope_default	1
46	2026_08_12_000001_add_total_subscription_fee_to_clients_table	1
47	2026_08_17_000001_add_public_key_and_agent_challenges	1
48	2026_08_18_000001_add_installation_uuid_and_revoked_at_to_agents	1
49	2026_08_19_000001_add_agent_ownership_to_servers	1
50	2026_08_19_143148_rename_monitoring_filter_columns_on_servers	1
51	2026_08_19_152532_add_cascade_delete_to_server_updates_table	1
52	2026_08_19_163836_add_available_sets_to_agents	1
53	2026_08_20_151348_add_pids_to_processes_and_key_by_name	1
54	2026_08_24_162723_create_server_network_stats_table	1
55	2026_08_25_122638_add_network_filter_to_servers_and_available_interfaces_to_agents	1
\.


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.migrations_id_seq', 55, true);


--
-- PostgreSQL database dump complete
--

<<<<<<< Updated upstream
\unrestrict 5HDfiM7evMgsCwKSn5iEl7vJfWzFRl0dvErrrDF3qH4fpPhQ4TGU8m0ttUKGJ2U
=======
\unrestrict ekEJOikXwfLd8UYHiet0VRPIFlqbUY4BztBdqDrD9BcnOEsEXHPmExC892Tk1vf
>>>>>>> Stashed changes

