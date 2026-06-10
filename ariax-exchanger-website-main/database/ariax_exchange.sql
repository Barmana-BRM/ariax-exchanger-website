-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 07, 2026 at 12:01 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `ariax_exchange`
--

-- --------------------------------------------------------

--
-- Table structure for table `kyc_details`
--

CREATE TABLE `kyc_details` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `full_name` varchar(100) NOT NULL,
  `national_id` varchar(10) NOT NULL,
  `phone` varchar(11) NOT NULL,
  `rejection_reason` varchar(300) DEFAULT NULL,
  `submitted_at` datetime NOT NULL DEFAULT current_timestamp(),
  `reviewed_at` datetime DEFAULT NULL,
  `reviewed_by` varchar(36) DEFAULT NULL,
  `national_id_image` varchar(255) DEFAULT NULL,
  `home_address` varchar(300) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `draft_token` varchar(64) DEFAULT NULL,
  `selfie_image` varchar(255) DEFAULT NULL,
  `supporting_document` varchar(255) DEFAULT NULL,
  `supporting_document_type` varchar(50) DEFAULT NULL,
  `current_step` tinyint(4) NOT NULL DEFAULT 1,
  `step1_status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `step2_status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `step3_status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `overall_status` enum('draft','pending_review','approved','rejected') NOT NULL DEFAULT 'draft',
  `face_match_score` decimal(5,2) DEFAULT NULL,
  `step1_payload` longtext DEFAULT NULL,
  `step2_payload` longtext DEFAULT NULL,
  `step3_payload` longtext DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `kyc_details`
--

INSERT INTO `kyc_details` (`id`, `user_id`, `full_name`, `national_id`, `phone`, `rejection_reason`, `submitted_at`, `reviewed_at`, `reviewed_by`, `national_id_image`, `home_address`, `email`, `draft_token`, `selfie_image`, `supporting_document`, `supporting_document_type`, `current_step`, `step1_status`, `step2_status`, `step3_status`, `overall_status`, `face_match_score`, `step1_payload`, `step2_payload`, `step3_payload`, `updated_at`) VALUES
(1, 'user-001', 'علی رضایی', '0012345678', '09121234567', '', '2026-06-01 13:34:17', '2026-06-07 11:43:41', 'admin-001', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 'pending', 'pending', 'pending', 'approved', NULL, NULL, NULL, NULL, '2026-06-07 11:43:41'),
(2, 'user-001', '?????? ??????????', '0012345678', '09121234567', '', '2026-06-02 09:30:24', '2026-06-07 11:43:42', 'admin-001', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 'pending', 'pending', 'pending', 'approved', NULL, NULL, NULL, NULL, '2026-06-07 11:43:42'),
(3, 'user-001', '?????? ??????????', '0012345678', '09121234567', '', '2026-06-02 09:36:35', '2026-06-07 11:43:42', 'admin-001', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 'pending', 'pending', 'pending', 'approved', NULL, NULL, NULL, NULL, '2026-06-07 11:43:42'),
(4, 'u-6a1e95635df63', 'Test User', '1234567890', '09123456789', '', '2026-06-02 12:03:39', '2026-06-07 11:43:43', 'admin-001', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 'pending', 'pending', 'pending', 'approved', NULL, NULL, NULL, NULL, '2026-06-07 11:43:43'),
(5, 'u-6a1e95c4522ee', 'Test User', '1234567890', '09123456789', '', '2026-06-02 12:05:16', '2026-06-07 11:43:44', 'admin-001', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 'pending', 'pending', 'pending', 'approved', NULL, NULL, NULL, NULL, '2026-06-07 11:43:44'),
(6, 'u-6a1e95ce8cf35', 'Test User', '1234567890', '09123456789', '', '2026-06-02 12:05:26', '2026-06-07 11:43:44', 'admin-001', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 'pending', 'pending', 'pending', 'approved', NULL, NULL, NULL, NULL, '2026-06-07 11:43:44'),
(7, 'u-6a1e961213695', 'نفیسه نصری', '1273678702', '09162121126', '', '2026-06-02 12:06:34', '2026-06-07 11:43:45', 'admin-001', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 'pending', 'pending', 'pending', 'approved', NULL, NULL, NULL, NULL, '2026-06-07 11:43:45'),
(8, 'user-001', 'علی رضایی', '0012345678', '09121234567', '', '2026-06-03 12:55:09', '2026-06-07 11:43:46', 'admin-001', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 'pending', 'pending', 'pending', 'approved', NULL, NULL, NULL, NULL, '2026-06-07 11:43:46'),
(9, 'u-6a251600a753f', 'علی عباسی', '1232323212', '09132121154', '', '2026-06-07 09:55:03', '2026-06-07 11:43:33', 'admin-001', 'uploads/kyc/kyc_6a2515c60cd7c1.80963395.png.enc', 'اصفهان، خیابان یک، کوچه دو، پلاک سه', 'ali@gmail.com', 'abe6cbc014981b8a374caa740b3e9903', 'uploads/kyc/kyc_6a2515cc4a4516.08621745.png.enc', 'uploads/kyc/kyc_6a2516008bb606.98536067.png.enc', 'image/png', 3, 'approved', 'pending', 'approved', 'approved', 0.00, 'eyJpdiI6Im1LbXhIQXh4ZHJMUC81MHUiLCJ0YWciOiJVUVVvbVBiM0VhR0dBb08ySndvSERBPT0iLCJjaXBoZXIiOiJrSXYzRlNrOEtMNUk4TW4xN3RoUUNaWFRKNktpMXRScDd0akI0VTJSM2hlRzVZVXNKYUEvYXltY3FTQUxkQnJhdCs4dU1Va2V1M3JDR2dhRzVqVTMwaEEyenRrZmNoZjVhbUxKdnJWK2hXTElPcmE1TU1jMUo5Tm0zaUExQ2l1QVRDN0x5Y1pXYlpjdWhLWXdhOUU1MGNZK3lzNGRETmJQWGRYb1hPNWFBdz09In0=', 'eyJpdiI6IjRJaHpCU3RrTTZsSDBBcTgiLCJ0YWciOiJnREhhd3U2bi91a2lQdlFVRkI5YXJBPT0iLCJjaXBoZXIiOiI3ZENobGhyaThBN3J6b2hpd01LdElkbEpkclhHRGE5V0hzL2JOSC9HQTM5YndhOW16eDRENTRwQ0RKd0c1L1psbHdSTVdIaWdSdXdLSDU0RERBPT0ifQ==', 'eyJpdiI6IllGdDQwd3YvcFpFTFk4eTQiLCJ0YWciOiJEbXFWVjVIMDFRek1INU8rb25YQTVBPT0iLCJjaXBoZXIiOiJiOU45bkg0Tm1VSWRPcEMvUG9TUjJKclQ3bW9Db1I4NHdaWU1pVGJqUzJPUUlwT3FOUnpBV2svQ1ZHNTA1b2ZXWW1ONS9LL1BkbGpoVUxoQVA3aEc3SklZeXF6RVgwaUgzNTBtMGlvSURHNEVHTnMwekpYSUg5Tmoxc2Y1M3A4WHVYYkw4ZjIrNHhvY3NJTFBVdGVFbGZDQTFjWW1ycmVQb09RVmZjS2FGL289In0=', '2026-06-07 11:43:33'),
(10, 'u-6a2516be53317', 'مریم قادری', '1231414714', '09131021126', '', '2026-06-07 10:28:07', '2026-06-07 12:14:26', 'admin-001', 'uploads/kyc/kyc_6a25167f2046a6.81456298.png.enc', 'تهران، خیابان یک، کوچه 2. پلاک 14', 'maryam@gmail.com', '38e3929e04efb587ca554f7f2da87974', 'uploads/kyc/kyc_6a25169570f261.91157895.png.enc', 'uploads/kyc/kyc_6a2516be34bd49.06927367.png.enc', 'image/png', 3, 'approved', 'approved', 'approved', 'approved', 0.00, 'eyJpdiI6InMxTkNFK3NNWlVZTGF0L1oiLCJ0YWciOiJxUGp1NjBYTDF5VWRSRnZBZ01LNmlnPT0iLCJjaXBoZXIiOiJTY0xOakNFa1hzb0puaUxkYnA0QUFhRDhWQTNlOGtpSVRGeFJrQ3RJaHc4OVhqUXJYNkFCcERnRkd4RzRuVzlhdThiT2RMaS9ZTHVtY0FwOU1scmtNYW1DQmZOL3lsMlVZM3R6Q0F5d3A4dXhIUG9KeTN2WWYwNzJob21LT2Z1TTIrZDhxU1Jud014eTRCYnFseVBQenkxZ2Q4WmZwc0VJb05xRjJkdXZZc3p2TEVHSSJ9', 'eyJpdiI6IlIxSTRXcDVjOHBMalE0dEsiLCJ0YWciOiJubmdSbnZRR0Jlcnp0bS9JMUFzODZRPT0iLCJjaXBoZXIiOiJuUUYyOWFrNkNuTmJzVVZsK0FGYWtycVhEMEhtOUFZdjRqNkZjWlR2eittK25vaExGYnJ6bjcrTkQ2bEdxcEFic29IOUVaS09NeDAzWkl3cXRRPT0ifQ==', 'eyJpdiI6InNDdzFpMnhoclBRNGpSeU4iLCJ0YWciOiJzNFJZTm5QUzBZM2EwVFlHS05qTXRBPT0iLCJjaXBoZXIiOiJFaVdjc3lnVjNQNXZ5cGQ2T2NmVkhHNkJsRkYwcEM3Y3p6ZlhFMHpYWjVWZGZlRTQxRnEvVk15M3dGcksvOWhHTER0TVhhSnNjcHFwZ21QejI5RkJQRzJ4eEZ0eEI1NzcyeWdIK0luekdBQVRiR2NkNnk3MWEyV0psT1lOTVdrdjdnS0pNVzZxSXpQeEJKT3EwT2gwTkNEdUZPZjR0VmNwIn0=', '2026-06-07 12:14:26'),
(11, 'u-6a25232371f84', 'سوگل معین زاده', '1293434323', '09131021212', '', '2026-06-07 10:58:46', '2026-06-07 12:14:25', 'admin-001', 'uploads/kyc/kyc_6a2522c6b22139.93185293.png.enc', 'اصفهان، خ جابر، کوچه 5، پلاک 15', 'sogolmoein@gmail.com', '9eb882ae20ea634cda9962b548b89e74', 'uploads/kyc/kyc_6a2522ff11a5d9.04205648.jpg.enc', 'uploads/kyc/kyc_6a2523230897e5.48888987.png.enc', 'image/png', 3, 'approved', 'approved', 'approved', 'approved', 0.00, 'eyJpdiI6ImFxQjlxVmNhZDcrdDdYcGEiLCJ0YWciOiJseTJQT0dCZW10akpEQ2ljNENKU2V3PT0iLCJjaXBoZXIiOiJwU2NCOHRkZHFZYTZTRitFS0FGKzFNcHVxQ1ZHbHBwb0V3M2hzb3dEWTZmZkxUZEs2bjBXTzZSWURsdWpaYlFZaHFwT1lIemNRa2xib2NTaEpBcVNtMDdJK081UTVRY2dSaWphd0JtZ0RaNWo0bldYV3pwT0lEc2dLQmMvb3lodnF5NFlXZjgwYkpFZzBJUFpuc0hlcXdUNUFmemhQU2djanV0SjhhMHBtdktndU4rOWZIWHY5VlNTai9DbnIycz0ifQ==', 'eyJpdiI6IlB0aWpibGFEc0dHMG1ITGwiLCJ0YWciOiJvR1VHM09RV2xyak1VcFdOb1NBN1JBPT0iLCJjaXBoZXIiOiIwUGhmRXRNYk56RE1wcVMvaHFabGJ5TERad1BncEtLYTFJMERCL3hUQWkreDdvRmpwbkNBdTFkNlUzMWcxTFlDQTloQUo0YVFKSTZKazJjd2RBPT0ifQ==', 'eyJpdiI6InRpMERRaFRDclNRUGovckkiLCJ0YWciOiJTR3B1Q29WYTFTMWJ3N2x3TmUzcUFBPT0iLCJjaXBoZXIiOiJucDNIc2p2Q3RmLzhqbXNud1Z5WUt4YTl6cVJWR2RlUHFqMDBrWlh2enBUeTlZNit0TXZ5VmV5SnF2cFFJWjlyckVVMDFuaWtCdXdjMGZrbmh3c0JhQnRqNXhqa21Xdk5yTzNaMW5EeHJ5S2wzWlFzUTNhb1VuNmxZaVdNN2N3c0xSOWp5UW0yeDFMKzBxUzJ2TThpMVFud0pFNUIifQ==', '2026-06-07 12:14:25'),
(12, 'u-6a2523dd485c0', 'مریم رضایی', '1285878758', '09124747878', '', '2026-06-07 11:24:05', '2026-06-07 12:14:24', 'admin-001', 'uploads/kyc/kyc_6a25239d0212b7.67056805.png.enc', 'اصفهان,ارازلبتلطهفبز نلرعذات لرنذاهندخن', 'nafiseh.nasr.80@gmail.com', '5a9d557bce223c5ad8bfc96850875970', 'uploads/kyc/kyc_6a2523b628bbf5.15828085.jpg.enc', 'uploads/kyc/kyc_6a2523dd0c1763.48541081.png.enc', 'image/png', 3, 'approved', 'approved', 'approved', 'approved', 0.00, 'eyJpdiI6ImdCdjZmSVBQdW91UkNQcjIiLCJ0YWciOiJuZzJiazhnWGRQU1dzZGZkT1pDaTdnPT0iLCJjaXBoZXIiOiJHT1lXL2R6Tjk5b2ZsVHFwc3MzbVZENGJGRG5xdHJwektZc1VQVUQxdjlqdnRiZFZIdmRVSHlBY0ZUVmJlTElrN0I4ZXdSR29vV0haU2l0VWcxQmxDek1vRHJzcEtFVWxSME1pdEhwTlYwaXZRQmdSR1VZYUFqMU50ZlRFZCtRcmtlL3AySnRrM0daVjU0RUJNV2doNE5neVJuTHkvdEduQ3BLRWY4TWxoUDViWUZYRE5VZ1U1SnEyTGlLZSJ9', 'eyJpdiI6InpORGpJcDR5WHZTMlNabzciLCJ0YWciOiJOYVVUbHBxTkZXS3hpbEErYzNrdlN3PT0iLCJjaXBoZXIiOiJBaXZodTFXd3NXS0laU3Q0TGdrM2xqTjZMUDhaTVhvK2h0VVBCQThVajVISWI3bTN0OE1BNXkzNlJ4b3JzVUpWZjhJand0T2lvT0gxTEZtR0l3PT0ifQ==', 'eyJpdiI6IkZLaUN1NEV0VnpVeTJZOGoiLCJ0YWciOiJnTzNlV0FrNjJlbFJzRTkrSklIUTJRPT0iLCJjaXBoZXIiOiJ2L2s2UGtlZURoZVVLNXFaSVBnUzB4K1Q5R3pKdzVIWXozeUc2ZmszR1hZODJ2K2RIYkEvUU1FVWJhS3dCTm5XemM5bjB0VFpyNDNNUlE1aEt3TzM1R2hDVGFDcUpGdzdpUHFWQ05saklNcC8wenZycFJJNXZxUHhJSGdLUzdBRjJOQnNLMlZ0M3RNS2MzZ25GZlRLZ1dEcENxbkxLemdSNmd1K1llM2YxbVpmbFhPRUNtc3M1NzJyaGc9PSJ9', '2026-06-07 12:14:24'),
(13, 'u-6a25270edc09a', 'سامان زمانی', '1244545545', '09132585858', '', '2026-06-07 11:38:04', '2026-06-07 12:14:22', 'admin-001', 'uploads/kyc/kyc_6a2526e43b1a31.66737040.png.enc', 'اصفهان تذقلذشثقذلتشثهقذلهشث تقثذلکهشثذقلهعشثق', 'saman@gmail.com', '8f6a487bc274268c1f37cdc1493313ea', 'uploads/kyc/kyc_6a2526f2dd6294.80385260.jpg.enc', 'uploads/kyc/kyc_6a25270ea36c08.61488111.png.enc', 'image/png', 3, 'approved', 'approved', 'approved', 'approved', 0.00, 'eyJpdiI6Ilk2V0JvdFAvVnBQcjF5eTciLCJ0YWciOiJXYXVBOEVDZkFBME1wajllQ3l3YjZnPT0iLCJjaXBoZXIiOiJKN3crdmJyUXFSNnBVZWRRbFJUQmViQTdjcjB2b05jcG5UaHBBbElVai9nb1E4S0FaOW5oZnEwOFUyd25SNEp6ZkVDdG91UVdhQkxsbVVJd3pvM3hrbGFaQTV1bFl2Q0c1bUdPWVVZWlk0YjFJUk52enVhUUQ3aU5RT0s3L1RabElBaXl1VVRPVTlKZ1FRcjJSb1R1dUJuMGhMVC91ZmV0TWs4SGM3UzQ5djVWdnBFL2lnPT0ifQ==', 'eyJpdiI6ImNmaGRrMXdQUFNpY0hFTmkiLCJ0YWciOiJ0QUh2bkJTa3Q2UnRMa2VEbm5pUHVRPT0iLCJjaXBoZXIiOiJkUzJsTkN1aEE0bHQxbHFPVjJzTjJVZTcwejJtbmpDRStBRU54aHJ3RzZQZGFUYkxRRy82OFordkZNL0VjOVNZUzNXZS8xSTNvOGN2NkVxK2dRPT0ifQ==', 'eyJpdiI6Im5JQTZyRHRlNGQ3UHl2WUQiLCJ0YWciOiJQaGlJU3NhKzFhOWlBeVV6ZVdVWXJBPT0iLCJjaXBoZXIiOiJSSUpOemRYZWtpMzJnVmRKTW9ubHgzb0ZZRnFBWkg2ZFpnSE1iQm5aZXVzamdoLzdsektZV1NyQktNMm5jT2QydjNBczRidkROb0tZZ1VpSm9rWFV1Z2hJUEEvZnFtNEN4QWFiRmJYY0Y5ODYydDVudlUrODI2cXNFdXhxR3d3alZHSlU4VDVGQ0FHYzNEWWNvSjVzcmlCMTBDSDd2QmFQR0xRUmc2WkxjZmdranZmZkdqMFdUenZxeldoaW9QaXJJNTBGMlBvUGdFVT0ifQ==', '2026-06-07 12:14:22'),
(14, 'u-6a252f4613fb0', 'رضا منصوری', '1285887858', '09122585898', NULL, '2026-06-07 12:12:43', '2026-06-07 12:14:20', 'admin-001', 'uploads/kyc/kyc_6a252f03774074.45038774.png.enc', 'اصفهاننیثتهتسهتسمهتسمخنسمت', 'rezaman@gmail.com', '8fec410f4af9a89f256f398912d9593c', 'uploads/kyc/kyc_6a252f26908967.56549108.jpg.enc', 'uploads/kyc/kyc_6a252f45cbcf66.12203325.png.enc', 'image/png', 3, 'approved', 'approved', 'approved', 'approved', 0.00, 'eyJpdiI6IkdiMGFITnBSbUZPTXRkRUYiLCJ0YWciOiJZUURMNFpVeUJaZHIybytoUllKZGZnPT0iLCJjaXBoZXIiOiJOdU5VK2RkcHZweFhUZ1QxZmoxQ05GOFY1Q2Z5RDdiaDJUczMvOTN2WnZJSFVJemkrUTRuOGsrbnRUaUpocUNTeXZKVm5HRWZZRkxMVjJKYmxmZXZSVXRWWGpKZjVtbkR5Kys4RXlmbEhweGQ2MEwwazhmc0hHek9iT3p6a2gxTjEyTysybm51K1JBNXV1YVhKY3EzelBweGhTR0hwam5XdHRJakdIZkhPUGQ4QTZmeExRPT0ifQ==', 'eyJpdiI6IkxLQlAzNTFNVlNPTGxrS0oiLCJ0YWciOiJOWDcwZm5IWkdKR1J1MWp0MWtFRklnPT0iLCJjaXBoZXIiOiJoOXlPc0cwbG1LUjFFNFZCeTdNL3hzUjM2TXQzUXp5cWt4Yy9oRGhZQmxDenNXUEppdjllSDFRbjVOUFlsdS9PVWVINEF4Z3oxSlFHYnExZnV3PT0ifQ==', 'eyJpdiI6IktPbDMrcmZGZngyK3pDcTkiLCJ0YWciOiJhdVd4MnNhejFicnBpRDhNMExlWjJRPT0iLCJjaXBoZXIiOiJxZjB3YTFlYmFjekt2ZUlqNFN6QlNNRHFXbFJuRkJOQmhyb2JJSndjMHBMa3IzTWFBTUx3VjRjMkNYQkpmVzNIQjlYb0pkb1U2eUZDcWJqNk93cmRWREhYSUNRRkdWZ2poaklmd1V0S0lSUkd6UGduOTAwMEMrbm9SMERyNkxQM0QreW9RWWxxVGw2Zk43N3oxNzV6bWp4U0MzRT0ifQ==', '2026-06-07 12:14:20'),
(15, 'u-6a2530e86a251', 'نفیسه شهریاری', '1284745457', '09162128978', NULL, '2026-06-07 12:20:06', '2026-06-07 12:59:03', 'admin-001', 'uploads/kyc/kyc_6a2530be354898.96139798.png.enc', 'تهران ، ختدقلبدتظیقتلبدیلیقبلظقیلببی', 'nafisshah@gmail.com', '11bb9707c3a2a4d30c36bc2e99739347', 'uploads/kyc/kyc_6a2530c9094c43.85733582.jpg.enc', 'uploads/kyc/kyc_6a2530e82a6bd0.07426132.png.enc', 'image/png', 3, 'approved', 'approved', 'approved', 'approved', 0.00, 'eyJpdiI6IlBmMGFEWW9wOXh5RUl4UHYiLCJ0YWciOiJvWjJVZENQOG85TG1VeFNnN1JwNjNRPT0iLCJjaXBoZXIiOiIrblEzenB1cTNrOUVXSEppMmtwcWpVMUJxZlprSmpzUFlaTHE3QW5zQ3Q1QVhhU2d1ZlkvNnRJSmUrK29JenhWZDR0UXVxb1hSb3cvaFZWcjArcXJZRWl1Vno2S1lSeUcwMDJKNk1IbzdPTldxNm5EU1RqRDBrRHd0NS9DYlAyK0hlaTNtQ1kvKzVhbVdqdkJrSlpuQzMxcHVBQWtkZ0JkZDVJczhWa0dMUHpXUXNWemw1K0Z5TGs3Y3JRTCJ9', 'eyJpdiI6ImM1VE01aXAzTXRZc00zdHEiLCJ0YWciOiJOQ1ZPSUpqaHQyS2Vsc2REUi9WL25nPT0iLCJjaXBoZXIiOiJSaGlsZWNXd0FhYzdnS2F6OHBLWG55U3hYTjl3RUxsRE1ZSjFOZDNyMWN2bDdIdHRxUElqdUExS1RLQ3lJbU9Ec0hVQkxEUUcyUnNqOXAwdjFnPT0ifQ==', 'eyJpdiI6IlZVdzVveE1YSmtCalBPd2MiLCJ0YWciOiI2akZrQXNtWVFWVHRGQW1FbnRRcUJ3PT0iLCJjaXBoZXIiOiJNYzI4MTZhY2tXL01YbVlGMTV0VXVGRitBK29WbjJGeENJYkhKQnZyRXNUeGkxUDlXTjR5UmdPSVZ1U2pobER4SUdiUHMxQWY1MkkvaGkzYTVNNWpQcWttZ1I3TnlodCtFRGs0ZDZRT2o4Qlhob3FuanM5Ymd5cUJEcHR6Zk5xVy9EZkhqRzJnUXVWQzJwOGhwalJkSGU0SytTSkQrbTN2S21laDFhNGtOL1BjWjYzbWtUMD0ifQ==', '2026-06-07 12:59:03');

-- --------------------------------------------------------

--
-- Table structure for table `market_prices`
--

CREATE TABLE `market_prices` (
  `id` int(10) UNSIGNED NOT NULL,
  `symbol` enum('BTC','ETH','USDT','TRX') NOT NULL,
  `price_irt` decimal(20,2) NOT NULL,
  `price_usd` decimal(18,6) NOT NULL,
  `change_24h` decimal(8,4) NOT NULL DEFAULT 0.0000,
  `volume_24h` decimal(20,2) NOT NULL DEFAULT 0.00,
  `high_24h` decimal(20,2) NOT NULL DEFAULT 0.00,
  `low_24h` decimal(20,2) NOT NULL DEFAULT 0.00,
  `recorded_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `market_prices`
--

INSERT INTO `market_prices` (`id`, `symbol`, `price_irt`, `price_usd`, `change_24h`, `volume_24h`, `high_24h`, `low_24h`, `recorded_at`) VALUES
(1, 'BTC', 3800000000.00, 67000.000000, 2.4000, 28500.00, 3850000000.00, 3720000000.00, '2026-06-01 13:34:17'),
(2, 'ETH', 190000000.00, 3350.000000, -1.2000, 14200.00, 195000000.00, 187000000.00, '2026-06-01 13:34:17'),
(3, 'USDT', 56000.00, 1.000000, 0.1000, 95000.00, 56200.00, 55800.00, '2026-06-01 13:34:17'),
(4, 'TRX', 680.00, 0.120000, 3.1000, 8700.00, 700.00, 660.00, '2026-06-01 13:34:17'),
(5, 'BTC', 3800000000.00, 67000.000000, 2.4000, 28500.00, 3850000000.00, 3720000000.00, '2026-06-02 09:30:24'),
(6, 'ETH', 190000000.00, 3350.000000, -1.2000, 14200.00, 195000000.00, 187000000.00, '2026-06-02 09:30:24'),
(7, 'USDT', 56000.00, 1.000000, 0.1000, 95000.00, 56200.00, 55800.00, '2026-06-02 09:30:24'),
(8, 'TRX', 680.00, 0.120000, 3.1000, 8700.00, 700.00, 660.00, '2026-06-02 09:30:24'),
(9, 'BTC', 3800000000.00, 67000.000000, 2.4000, 28500.00, 3850000000.00, 3720000000.00, '2026-06-02 09:36:35'),
(10, 'ETH', 190000000.00, 3350.000000, -1.2000, 14200.00, 195000000.00, 187000000.00, '2026-06-02 09:36:35'),
(11, 'USDT', 56000.00, 1.000000, 0.1000, 95000.00, 56200.00, 55800.00, '2026-06-02 09:36:35'),
(12, 'TRX', 680.00, 0.120000, 3.1000, 8700.00, 700.00, 660.00, '2026-06-02 09:36:35'),
(13, 'BTC', 3800000000.00, 67000.000000, 2.4000, 28500.00, 3850000000.00, 3720000000.00, '2026-06-03 12:55:09'),
(14, 'ETH', 190000000.00, 3350.000000, -1.2000, 14200.00, 195000000.00, 187000000.00, '2026-06-03 12:55:09'),
(15, 'USDT', 56000.00, 1.000000, 0.1000, 95000.00, 56200.00, 55800.00, '2026-06-03 12:55:09'),
(16, 'TRX', 680.00, 0.120000, 3.1000, 8700.00, 700.00, 660.00, '2026-06-03 12:55:09');

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `token` varchar(64) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(300) DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sessions`
--

INSERT INTO `sessions` (`token`, `user_id`, `ip_address`, `user_agent`, `expires_at`, `created_at`) VALUES
('0436386380c8082f4e34c1421f82f8da440b0920eee1745b7fa101a16a241217', 'admin-001', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 10:10:29', '2026-06-07 11:40:29'),
('0b5ac32b3e8f84ca2403629594a55c65d166a66316645348bf2869a521da6944', 'admin-001', '127.0.0.1', 'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.8457', '2026-06-08 08:20:54', '2026-06-07 09:50:54'),
('1281cfbf68a592df6eb722729e335e209beeb6c317ae81404c48cf07981dc2fc', 'admin-001', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 09:49:34', '2026-06-07 11:19:34'),
('1570cf29ede4c40348485253bbfaee71cadbac039915f851ba916c5d484c98ed', 'user-001', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 11:50:21', '2026-06-07 13:20:21'),
('16767ef91721500dcc2ea4e888e87617a1f101482df4d9b5983d0a56a2212d1c', 'u-6a2530e86a251', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 10:52:01', '2026-06-07 12:22:01'),
('19b69d13d479e4ca1a94ccc66ebf8636a76b3ce275f9e4058adb17a1799eb60b', 'u-6a2523dd485c0', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 09:55:17', '2026-06-07 11:25:17'),
('1db5607deb316f31688d9b72e4450a60db1385833d40543f015dbc11f1c8d186', 'user-001', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-06-04 10:34:49', '2026-06-03 12:04:49'),
('2ab91ab67800df69086249cb381ab5b029d1814a1d991cb2c718b3499311e3b0', 'user-001', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 08:23:46', '2026-06-07 09:53:46'),
('356c22bbbf0fd679296d47aa679996c2a127b559be06c6a13b14e8665d81158c', 'u-6a2530e86a251', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 11:51:07', '2026-06-07 13:21:07'),
('38a4989ba5479ae5004b5d4b8fba2700b29d67a1d9ca2b165f0871a53d43535c', 'u-6a1e961213695', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-06-03 10:36:45', '2026-06-02 12:06:45'),
('43b1ae19a45ff3eb02df0d931e070e2e6613f538b3808afb1a91a64583ec9fa0', 'admin-001', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 10:51:06', '2026-06-07 12:21:06'),
('4ba09049c542cd8760f41c52e737d263bd69993ef9b774ddfbcbe8d6b82edaf4', 'admin-001', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-06-03 08:22:07', '2026-06-02 09:52:07'),
('4d6ccf4c0992e880979323bc01a4ffb9cf79961bee717e2f346ee1dafcf1023c', 'u-6a2530e86a251', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 10:55:23', '2026-06-07 12:25:23'),
('514ceb8451fb31bdc027d42851bae0a7a8bdc6a202bbc8f86f60a06ed1ff5ef7', 'admin-001', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 08:56:21', '2026-06-07 10:26:21'),
('591a4d0622a7c790fea17e7b4746dacf2408e39755cc540bb7dba8b725ef1732', 'user-001', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 11:53:50', '2026-06-07 13:23:50'),
('59b6633d13ef62e794c6919601e75edf415f89b7ef267baec68c8153a088ea33', 'admin-001', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-06-03 08:15:44', '2026-06-02 09:45:44'),
('65994c4487b2ccdcdbf75e4f5c335c38c79e2081d46dc9de0270ee5395f30971', 'admin-001', '::1', 'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.8457', '2026-06-03 08:07:18', '2026-06-02 09:37:18'),
('66b39a66b439a0a87fea3a8d250b274c4ee19f6b8ee3a7ee4be46321f625a01b', 'user-001', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 09:27:03', '2026-06-07 10:57:03'),
('66b63199c5870720e4f72fe41057ac2377f5fe3f81c6c470681fdbf1364bf2d7', 'admin-001', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-06-04 08:43:08', '2026-06-03 10:13:08'),
('6ad417553daedcf0c51f8d0cee2d1203ab43d9e2fc7cfad65b7f92caa28a37aa', 'admin-001', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-06-04 11:45:01', '2026-06-03 13:15:01'),
('6f92ed72691378f7a768ad0ef953863ec53e61f5402ebb9178a357643c8a9594', 'u-6a251600a753f', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 08:56:37', '2026-06-07 10:26:37'),
('6ff9b71d034e94e5b897896e5ca8202de9920b89f33d40793742eaf9a9335e45', 'admin-001', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-06-03 08:21:02', '2026-06-02 09:51:02'),
('711a8706e0c0e18f3664497418f207116a7ca48aba5d5b411da0708feb2836d7', 'u-6a2516be53317', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 08:59:16', '2026-06-07 10:29:16'),
('7288fffe755773c424809dd8a13cd510d84148f7a66ccb61876157a5203cff29', 'admin-001', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 11:52:25', '2026-06-07 13:22:25'),
('73d03a01332bc41838e500dcb5dcfc27cdb8134257dc921122623489045655ba', 'admin-001', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-06-04 07:41:44', '2026-06-03 09:11:44'),
('744732e5b243d0c91492e861a92adbce69ef1e59da879ead757cb8f33f697df2', 'user-001', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 11:27:42', '2026-06-07 12:57:42'),
('767c2fb0ea56835af4b6a48351e8521372c51f8ac212fb94678effb4f3520b39', 'admin-001', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 09:52:32', '2026-06-07 11:22:32'),
('7830138e93c82120c9bb5ef964036db610a8a996dfa7068b659e7d33bf2a1d3c', 'admin-001', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-06-03 10:29:02', '2026-06-02 11:59:02'),
('7baace24ab35fae28a188fe12aa3c3a56dfd2d53f3b36ab2bcffc55cf0dc101b', 'admin-001', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 08:24:07', '2026-06-07 09:54:07'),
('7ef51821f747290051e1e7ada391c909391a2ae8221dd79519b96734e32b6ea3', 'admin-001', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 11:54:41', '2026-06-07 13:24:41'),
('81264db1dd4c431f8030fadfe710748f327c56e064791fd19a5490609cb1abcf', 'admin-001', '::1', 'Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.8457', '2026-06-03 08:09:17', '2026-06-02 09:39:17'),
('85fd6933b8da7dd222e2c0f269a7cc28967767909df34320634d248bda6790d0', 'u-6a251600a753f', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 08:56:04', '2026-06-07 10:26:04'),
('929a27f83bd1d8201e454dabc674c47d9ff575dd63c0547eddf82ed06dee6eb8', 'admin-001', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 08:59:26', '2026-06-07 10:29:26'),
('949dc1580e83e247d7845e07983cf12fe497ff9ceba614da82d188bec2494402', 'user-001', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-06-03 08:22:26', '2026-06-02 09:52:26'),
('9da07a82125805c609b02846d027cf906bbcfeea84dccf759494c1f6bf38fad1', 'admin-001', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 11:28:53', '2026-06-07 12:58:53'),
('a4f829f361cdc7e4eff39020c3d82a337fc0bd1ab97584cd21e0575fd229cca7', 'u-6a2530e86a251', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 10:50:53', '2026-06-07 12:20:53'),
('a67dd16d57166203f3729b898d3a228c0eb62706a0cf37fdc326e7f7944eb16d', 'u-6a25232371f84', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 09:52:17', '2026-06-07 11:22:17'),
('a8857af81636f6e066b80359e4eb8b5a8a0de398c73bfdbe78d536442f29f4e8', 'user-001', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 10:07:04', '2026-06-07 11:37:04'),
('accc530c264e9580af9632840ae16886e263ca89f671c97cfffd755ff9386009', 'user-001', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-06-04 07:40:49', '2026-06-03 09:10:49'),
('b08ceaa499ddfa3965dd397bf77e28b81396b2f295ef0200b6ab495a8b561263', 'admin-001', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-06-03 10:38:36', '2026-06-02 12:08:36'),
('b6664c102bb7d6bf5cfe3dffc00636b44b7eb0e7c537c203dbc3f2b9d0659c17', 'admin-001', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 09:27:14', '2026-06-07 10:57:14'),
('be2f8fce3781945de6cbd8c80b143b9fcab23738b7e6b1c2a9b7eeab63dab520', 'admin-001', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-06-04 07:43:51', '2026-06-03 09:13:51'),
('c5cf842663fc0516538999154139f49cdea70f331e178e35ce70e55f0ec53500', 'admin-001', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 10:48:51', '2026-06-07 12:18:51'),
('c636c62ca33c51ae8cd6323c8402101389e4daace4d1d12fcf3345fd3bbc214e', 'admin-001', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 09:55:32', '2026-06-07 11:25:32'),
('cdb230169684dcb304323184caf8adf40718b859bfcb4e646fdd1be7c827c0aa', 'admin-001', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 10:44:04', '2026-06-07 12:14:04'),
('cf2439f61adbee8c08c9abb0324266f55867a5e62adfbe2ca1bfa1044c915239', 'user-001', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-06-04 08:41:47', '2026-06-03 10:11:47'),
('d5a64f19c7fec74031e6ad287f79f84ef75d5a53700d95f197ee4104185ec6ae', 'user-001', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 11:41:12', '2026-06-07 13:11:12'),
('e47901259b142e6925d24da25b044d2433d2114e741b1a656c4d753c8413aa9f', 'admin-001', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 10:14:01', '2026-06-07 11:44:01'),
('ee728fda09fdce3978acd97671e8eab2e4437c3665bee00c0e4be63731c887cc', 'admin-001', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-06-04 10:08:00', '2026-06-03 11:38:00'),
('f2a14d6c08bd04553899e497056ae0eaab9ea18d100871fba43c242d38a0cbed', 'u-6a2523dd485c0', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 09:56:05', '2026-06-07 11:26:05'),
('fce5dc684761db4fc9e0715dd6936d9511bd4adff47e557f83ce0f948687c881', 'admin-001', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 10:54:05', '2026-06-07 12:24:05');

-- --------------------------------------------------------

--
-- Table structure for table `team_messages`
--

CREATE TABLE `team_messages` (
  `id` int(10) UNSIGNED NOT NULL,
  `sender_id` varchar(36) NOT NULL,
  `sender_name` varchar(100) NOT NULL,
  `message` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `team_messages`
--

INSERT INTO `team_messages` (`id`, `sender_id`, `sender_name`, `message`, `created_at`) VALUES
(1, 'admin-001', 'مدیر سیستم', 'سلام تیم! لطفاً درخواست‌های برداشت امروز رو بررسی کنید.', '2026-06-01 13:34:17'),
(2, 'user-001', 'علی رضایی', 'چشم، الان بررسی می‌کنم.', '2026-06-01 13:34:17'),
(7, 'admin-001', 'مدیر سیستم', 'سلام', '2026-06-03 09:13:00'),
(8, 'admin-001', 'مدیر سیستم', 'سلام تیم! لطفاً درخواست‌های برداشت امروز رو بررسی کنید.', '2026-06-03 12:55:09'),
(9, 'user-001', 'علی رضایی', 'چشم، الان بررسی می‌کنم.', '2026-06-03 12:55:09'),
(10, 'admin-001', 'مدیر سیستم', 'بهترین سایت صرافی', '2026-06-03 13:15:22');

-- --------------------------------------------------------

--
-- Table structure for table `team_tasks`
--

CREATE TABLE `team_tasks` (
  `id` int(10) UNSIGNED NOT NULL,
  `title` varchar(200) NOT NULL,
  `assigned_to` varchar(36) NOT NULL,
  `created_by` varchar(36) NOT NULL,
  `status` enum('todo','in_progress','done') NOT NULL DEFAULT 'todo',
  `category` enum('wallet','support','technical','liquidity') NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `team_tasks`
--

INSERT INTO `team_tasks` (`id`, `title`, `assigned_to`, `created_by`, `status`, `category`, `created_at`, `updated_at`) VALUES
(1, 'بررسی درخواست‌های برداشت', 'user-001', 'admin-001', 'in_progress', 'wallet', '2026-06-01 13:34:17', '2026-06-01 13:34:17'),
(2, 'به‌روزرسانی نرخ کارمزد', 'admin-001', 'admin-001', 'todo', 'technical', '2026-06-01 13:34:17', '2026-06-01 13:34:17'),
(3, '?????????? ??????????????????????? ????????????', 'user-001', 'admin-001', 'in_progress', 'wallet', '2026-06-02 09:30:24', '2026-06-02 09:30:24'),
(4, '??????????????????????? ?????? ????????????', 'admin-001', 'admin-001', 'todo', 'technical', '2026-06-02 09:30:24', '2026-06-02 09:30:24'),
(5, '?????????? ??????????????????????? ????????????', 'user-001', 'admin-001', 'in_progress', 'wallet', '2026-06-02 09:36:35', '2026-06-02 09:36:35'),
(6, '??????????????????????? ?????? ????????????', 'admin-001', 'admin-001', 'todo', 'technical', '2026-06-02 09:36:35', '2026-06-02 09:36:35'),
(7, 'بررسی درخواست‌های برداشت', 'user-001', 'admin-001', 'in_progress', 'wallet', '2026-06-03 12:55:09', '2026-06-03 12:55:09'),
(8, 'به‌روزرسانی نرخ کارمزد', 'admin-001', 'admin-001', 'todo', 'technical', '2026-06-03 12:55:09', '2026-06-03 12:55:09');

-- --------------------------------------------------------

--
-- Table structure for table `tickets`
--

CREATE TABLE `tickets` (
  `id` int(11) NOT NULL,
  `user_id` varchar(50) NOT NULL,
  `user_name` varchar(100) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `category` enum('wallet','support','technical','kyc','other') NOT NULL DEFAULT 'support',
  `status` enum('open','in_progress','closed') NOT NULL DEFAULT 'open',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tickets`
--

INSERT INTO `tickets` (`id`, `user_id`, `user_name`, `subject`, `category`, `status`, `created_at`, `updated_at`) VALUES
(1, 'u-6a2530e86a251', 'نفیسه شهریاری', 'باگ', 'support', 'in_progress', '2026-06-07 09:51:57', '2026-06-07 09:52:58'),
(2, 'user-001', 'علی رضایی', 'مالی', 'support', 'in_progress', '2026-06-07 09:54:18', '2026-06-07 09:54:58');

-- --------------------------------------------------------

--
-- Table structure for table `ticket_messages`
--

CREATE TABLE `ticket_messages` (
  `id` int(11) NOT NULL,
  `ticket_id` int(11) NOT NULL,
  `sender_id` varchar(50) NOT NULL,
  `sender_name` varchar(100) NOT NULL,
  `sender_role` enum('user','admin') NOT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ticket_messages`
--

INSERT INTO `ticket_messages` (`id`, `ticket_id`, `sender_id`, `sender_name`, `sender_role`, `message`, `created_at`) VALUES
(1, 1, 'u-6a2530e86a251', 'نفیسه شهریاری', 'user', 'تیی بنتینبظتدنتیدنتدیدی', '2026-06-07 09:51:57'),
(2, 1, 'admin-001', 'مدیر سیستم', 'admin', 'سلام', '2026-06-07 09:52:58'),
(3, 2, 'user-001', 'علی رضایی', 'user', 'ناثبمناثبمنامثنربانثاضب', '2026-06-07 09:54:18'),
(4, 2, 'admin-001', 'مدیر سیستم', 'admin', 'hgmgmj', '2026-06-07 09:54:58');

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `user_name` varchar(100) NOT NULL,
  `type` enum('deposit','withdraw','trade') NOT NULL,
  `asset` enum('IRT','BTC','ETH','USDT','TRX') NOT NULL,
  `amount` decimal(20,8) NOT NULL,
  `fee` decimal(20,8) NOT NULL DEFAULT 0.00000000,
  `destination` varchar(200) DEFAULT NULL,
  `tx_id` varchar(100) DEFAULT NULL,
  `status` enum('pending','completed','rejected') NOT NULL DEFAULT 'pending',
  `note` varchar(300) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `home_address` varchar(300) DEFAULT NULL,
  `postal_code` varchar(10) DEFAULT NULL,
  `requires_extended` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `transactions`
--

INSERT INTO `transactions` (`id`, `user_id`, `user_name`, `type`, `asset`, `amount`, `fee`, `destination`, `tx_id`, `status`, `note`, `created_at`, `updated_at`, `home_address`, `postal_code`, `requires_extended`) VALUES
('tx-001', 'user-001', 'علی رضایی', 'deposit', 'IRT', 10000000.00000000, 50000.00000000, 'بانک ملی', NULL, 'completed', NULL, '2026-06-01 13:34:17', '2026-06-01 13:34:17', NULL, NULL, 0),
('tx-002', 'user-001', 'علی رضایی', 'trade', 'BTC', 0.00200000, 0.00000400, 'تبدیل به USDT', NULL, 'completed', NULL, '2026-06-01 13:34:17', '2026-06-01 13:34:17', NULL, NULL, 0),
('tx-003', 'user-001', 'علی رضایی', 'withdraw', 'IRT', 3000000.00000000, 15000.00000000, 'بانک صادرات', NULL, 'completed', '', '2026-06-01 13:34:17', '2026-06-07 12:19:01', NULL, NULL, 0),
('tx-004', 'user-001', 'علی رضایی', 'deposit', 'IRT', 20000000.00000000, 100000.00000000, 'بانک ملی', NULL, 'completed', NULL, '2026-06-01 13:34:17', '2026-06-01 13:34:17', NULL, NULL, 0),
('tx-6a253f2605050', 'u-6a2530e86a251', 'نفیسه شهریاری', 'deposit', 'IRT', 999999999999.99999999, 10203021003.02000000, '—', NULL, 'completed', '', '2026-06-07 13:21:34', '2026-06-07 13:22:40', 'اصفهانتدیبنتدیظنبدنیتبدن', '8185561561', 1),
('tx-6a253f2d3aaab', 'u-6a2530e86a251', 'نفیسه شهریاری', 'withdraw', 'IRT', 999999999999.99999999, 999999999999.99999999, '—', NULL, 'pending', NULL, '2026-06-07 13:21:41', '2026-06-07 13:21:41', '', '', 0);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','user') NOT NULL DEFAULT 'user',
  `avatar_color` varchar(20) NOT NULL DEFAULT '#3b82f6',
  `balance_irt` decimal(20,2) NOT NULL DEFAULT 0.00,
  `balance_btc` decimal(18,8) NOT NULL DEFAULT 0.00000000,
  `balance_eth` decimal(18,8) NOT NULL DEFAULT 0.00000000,
  `balance_usdt` decimal(18,2) NOT NULL DEFAULT 0.00,
  `balance_trx` decimal(18,6) NOT NULL DEFAULT 0.000000,
  `addr_btc` varchar(100) DEFAULT NULL,
  `addr_usdt` varchar(100) DEFAULT NULL,
  `addr_trx` varchar(100) DEFAULT NULL,
  `card_no` varchar(20) DEFAULT NULL,
  `shiba_no` varchar(30) DEFAULT NULL,
  `kyc_status` enum('unverified','pending','verified','rejected') NOT NULL DEFAULT 'unverified',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `username`, `password_hash`, `role`, `avatar_color`, `balance_irt`, `balance_btc`, `balance_eth`, `balance_usdt`, `balance_trx`, `addr_btc`, `addr_usdt`, `addr_trx`, `card_no`, `shiba_no`, `kyc_status`, `is_active`, `created_at`, `updated_at`) VALUES
('admin-001', 'مدیر سیستم', 'admin', '$2y$10$IPPlO9PJHI25MwgDOPzFneVPeqk9pA2fv.xsYBv84gF/qUfnfvv3S', 'admin', '#10b981', 0.00, 0.00000000, 0.00000000, 0.00, 0.000000, NULL, NULL, NULL, NULL, NULL, 'verified', 1, '2026-06-01 13:34:17', '2026-06-02 09:36:35'),
('u-6a1e95635df63', 'Test User', 'testuser123', '$2y$10$mIneUIt6mpyw1PM2u8eA5.5sp8JfSQOAL7Anjp1KckfHcEMumLtDu', 'user', '#8b5cf6', 0.00, 0.00000000, 0.00000000, 0.00, 0.000000, NULL, NULL, NULL, NULL, NULL, 'verified', 1, '2026-06-02 12:03:39', '2026-06-03 09:11:51'),
('u-6a1e95c4522ee', 'Test User', 'testuser124', '$2y$10$e.JqrcYcirBnnP.p8Y.ifOAFNRVjdVHWs4WjPICGElJdY.nSuFbO6', 'user', '#8b5cf6', 0.00, 0.00000000, 0.00000000, 0.00, 0.000000, NULL, NULL, NULL, NULL, NULL, 'verified', 1, '2026-06-02 12:05:16', '2026-06-03 09:11:54'),
('u-6a1e95ce8cf35', 'Test User', 'testuser125', '$2y$10$dZ8i7eOtxkCg0fOvhO7JCuof2xVL2i8vmTQwilKCz3a4oVLE.xjGK', 'user', '#8b5cf6', 0.00, 0.00000000, 0.00000000, 0.00, 0.000000, NULL, NULL, NULL, NULL, NULL, 'verified', 1, '2026-06-02 12:05:26', '2026-06-03 09:11:55'),
('u-6a1e961213695', 'نفیسه نصری', 'nafisnasr', '$2y$10$UWgDiWl4NJa2anvdJpFBfew68OmQWQKIDbpGqdEer.zqeBWOjF0uy', 'user', '#8b5cf6', 0.00, 0.00000000, 0.00000000, 0.00, 0.000000, NULL, NULL, NULL, NULL, NULL, 'verified', 1, '2026-06-02 12:06:34', '2026-06-03 09:11:56'),
('u-6a251600a753f', 'علی عباسی', 'alirezaee', '$2y$10$hfAl3CHxzYnfsOXx3ElBFOIWln2ylNfa9f.L5N0PdfhYGLqAECYFW', 'user', '#8b5cf6', 0.00, 0.00000000, 0.00000000, 0.00, 0.000000, NULL, NULL, NULL, NULL, NULL, 'verified', 1, '2026-06-07 10:26:00', '2026-06-07 10:26:30'),
('u-6a2516be53317', 'مریم قادری', 'maryam', '$2y$10$aL62CCtpZ5bLM8ORBH0tXe63lkvKnEcKr.dxJv3L8w0xr2DP96w3O', 'user', '#8b5cf6', 0.00, 0.00000000, 0.00000000, 0.00, 0.000000, NULL, NULL, NULL, NULL, NULL, 'verified', 1, '2026-06-07 10:29:10', '2026-06-07 10:29:32'),
('u-6a25232371f84', 'سوگل معین زاده', 'sogol', '$2y$10$flKEpZNih6E78Yza8muAyeUe/kyHJdUezKhO0hpoOT1oTIoQy8OjC', 'user', '#8b5cf6', 0.00, 0.00000000, 0.00000000, 0.00, 0.000000, NULL, NULL, NULL, NULL, NULL, 'verified', 1, '2026-06-07 11:22:03', '2026-06-07 11:22:38'),
('u-6a2523dd485c0', 'مریم رضایی', 'maryamrez', '$2y$10$VGihNsC7HoBVgkYhMxUte.kbooO84w3DdellkpOy0kAQaDixpGrYu', 'user', '#8b5cf6', 0.00, 0.00000000, 0.00000000, 0.00, 0.000000, NULL, NULL, NULL, NULL, NULL, 'verified', 1, '2026-06-07 11:25:09', '2026-06-07 11:25:39'),
('u-6a25270edc09a', 'سامان زمانی', 'saman', '$2y$10$HWjBM7a0E6LAbEp7H97ISuH/7xQEd91L4fIX0myuetDpNyvHFW4pO', 'user', '#8b5cf6', 0.00, 0.00000000, 0.00000000, 0.00, 0.000000, NULL, NULL, NULL, NULL, NULL, 'verified', 1, '2026-06-07 11:38:47', '2026-06-07 11:40:36'),
('u-6a252f4613fb0', 'رضا منصوری', 'rezaman', '$2y$10$o32pfB721ZXxDd4IOyJEme0e8FCkPz3fAT6nK//T7hwEzJxodhtC.', 'user', '#8b5cf6', 0.00, 0.00000000, 0.00000000, 0.00, 0.000000, NULL, NULL, NULL, NULL, NULL, 'verified', 1, '2026-06-07 12:13:50', '2026-06-07 12:14:12'),
('u-6a2530e86a251', 'نفیسه شهریاری', 'nafishah', '$2y$10$wP/7Yx.98hE/EYwWEsQeO.BEOIB1NAYlFyCJWxC/tEHyO7YuRtjuG', 'user', '#8b5cf6', 989796978996.98, 0.00000000, 0.00000000, 0.00, 0.000000, NULL, NULL, NULL, NULL, NULL, 'verified', 1, '2026-06-07 12:20:48', '2026-06-07 13:22:40'),
('user-001', 'علی رضایی', 'user1', '$2y$10$MjWowxyxNK0tLCFvYgEUK.SDDSA75UxwjrBatp2SBWPKCy7jTDza6', 'user', '#3b82f6', 25485000.00, 0.00420000, 0.35000000, 240.00, 1200.000000, 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE', 'TXQ8v2LsQeEaFMG7Rx8vJ9Ep6sDtaVXnFR', '6037991234567890', 'IR120570028080013447370101DSDS', 'verified', 1, '2026-06-01 13:34:17', '2026-06-07 13:11:25');

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_system_stats`
-- (See below for the actual view)
--
CREATE TABLE `v_system_stats` (
`total_users` bigint(21)
,`pending_kyc` bigint(21)
,`verified_users` bigint(21)
,`pending_txs` bigint(21)
,`today_txs` bigint(21)
,`total_irt_held` decimal(42,2)
,`total_fees_collected` decimal(42,8)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_today_transactions`
-- (See below for the actual view)
--
CREATE TABLE `v_today_transactions` (
`id` varchar(36)
,`type` enum('deposit','withdraw','trade')
,`asset` enum('IRT','BTC','ETH','USDT','TRX')
,`amount` decimal(20,8)
,`fee` decimal(20,8)
,`status` enum('pending','completed','rejected')
,`destination` varchar(200)
,`created_at` datetime
,`user_name` varchar(100)
,`username` varchar(50)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_user_summary`
-- (See below for the actual view)
--
CREATE TABLE `v_user_summary` (
`id` varchar(36)
,`name` varchar(100)
,`username` varchar(50)
,`role` enum('admin','user')
,`kyc_status` enum('unverified','pending','verified','rejected')
,`balance_irt` decimal(20,2)
,`balance_btc` decimal(18,8)
,`balance_eth` decimal(18,8)
,`balance_usdt` decimal(18,2)
,`balance_trx` decimal(18,6)
,`total_txs` bigint(21)
,`pending_txs` decimal(22,0)
,`total_deposits_irt` decimal(42,8)
,`total_withdrawals_irt` decimal(42,8)
,`total_fees_paid` decimal(42,8)
,`created_at` datetime
);

-- --------------------------------------------------------

--
-- Structure for view `v_system_stats`
--
DROP TABLE IF EXISTS `v_system_stats`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_system_stats`  AS SELECT (select count(0) from `users` where `users`.`role` = 'user') AS `total_users`, (select count(0) from `users` where `users`.`kyc_status` = 'pending') AS `pending_kyc`, (select count(0) from `users` where `users`.`kyc_status` = 'verified') AS `verified_users`, (select count(0) from `transactions` where `transactions`.`status` = 'pending') AS `pending_txs`, (select count(0) from `transactions` where cast(`transactions`.`created_at` as date) = curdate()) AS `today_txs`, (select sum(`users`.`balance_irt`) from `users` where `users`.`role` = 'user') AS `total_irt_held`, (select sum(`transactions`.`fee`) from `transactions` where `transactions`.`status` = 'completed') AS `total_fees_collected` ;

-- --------------------------------------------------------

--
-- Structure for view `v_today_transactions`
--
DROP TABLE IF EXISTS `v_today_transactions`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_today_transactions`  AS SELECT `t`.`id` AS `id`, `t`.`type` AS `type`, `t`.`asset` AS `asset`, `t`.`amount` AS `amount`, `t`.`fee` AS `fee`, `t`.`status` AS `status`, `t`.`destination` AS `destination`, `t`.`created_at` AS `created_at`, `u`.`name` AS `user_name`, `u`.`username` AS `username` FROM (`transactions` `t` join `users` `u` on(`u`.`id` = `t`.`user_id`)) WHERE cast(`t`.`created_at` as date) = curdate() ORDER BY `t`.`created_at` DESC ;

-- --------------------------------------------------------

--
-- Structure for view `v_user_summary`
--
DROP TABLE IF EXISTS `v_user_summary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_user_summary`  AS SELECT `u`.`id` AS `id`, `u`.`name` AS `name`, `u`.`username` AS `username`, `u`.`role` AS `role`, `u`.`kyc_status` AS `kyc_status`, `u`.`balance_irt` AS `balance_irt`, `u`.`balance_btc` AS `balance_btc`, `u`.`balance_eth` AS `balance_eth`, `u`.`balance_usdt` AS `balance_usdt`, `u`.`balance_trx` AS `balance_trx`, count(`t`.`id`) AS `total_txs`, sum(case when `t`.`status` = 'pending' then 1 else 0 end) AS `pending_txs`, sum(case when `t`.`type` = 'deposit' and `t`.`asset` = 'IRT' then `t`.`amount` else 0 end) AS `total_deposits_irt`, sum(case when `t`.`type` = 'withdraw' and `t`.`asset` = 'IRT' then `t`.`amount` else 0 end) AS `total_withdrawals_irt`, sum(`t`.`fee`) AS `total_fees_paid`, `u`.`created_at` AS `created_at` FROM (`users` `u` left join `transactions` `t` on(`t`.`user_id` = `u`.`id`)) GROUP BY `u`.`id` ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `kyc_details`
--
ALTER TABLE `kyc_details`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `draft_token` (`draft_token`),
  ADD KEY `fk_kyc_user` (`user_id`),
  ADD KEY `fk_kyc_admin` (`reviewed_by`);

--
-- Indexes for table `market_prices`
--
ALTER TABLE `market_prices`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_price_symbol` (`symbol`),
  ADD KEY `idx_price_time` (`recorded_at`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`token`),
  ADD KEY `idx_session_user` (`user_id`),
  ADD KEY `idx_session_expires` (`expires_at`);

--
-- Indexes for table `team_messages`
--
ALTER TABLE `team_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_msg_sender` (`sender_id`),
  ADD KEY `idx_msg_date` (`created_at`);

--
-- Indexes for table `team_tasks`
--
ALTER TABLE `team_tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_task_assigned` (`assigned_to`),
  ADD KEY `idx_task_status` (`status`),
  ADD KEY `fk_task_creator` (`created_by`);

--
-- Indexes for table `tickets`
--
ALTER TABLE `tickets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_tickets_user` (`user_id`),
  ADD KEY `idx_tickets_status` (`status`);

--
-- Indexes for table `ticket_messages`
--
ALTER TABLE `ticket_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ticket_messages_ticket` (`ticket_id`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_tx_user` (`user_id`),
  ADD KEY `idx_tx_status` (`status`),
  ADD KEY `idx_tx_type` (`type`),
  ADD KEY `idx_tx_date` (`created_at`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `kyc_details`
--
ALTER TABLE `kyc_details`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `market_prices`
--
ALTER TABLE `market_prices`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `team_messages`
--
ALTER TABLE `team_messages`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `team_tasks`
--
ALTER TABLE `team_tasks`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `tickets`
--
ALTER TABLE `tickets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `ticket_messages`
--
ALTER TABLE `ticket_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `kyc_details`
--
ALTER TABLE `kyc_details`
  ADD CONSTRAINT `fk_kyc_admin` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_kyc_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sessions`
--
ALTER TABLE `sessions`
  ADD CONSTRAINT `fk_session_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `team_messages`
--
ALTER TABLE `team_messages`
  ADD CONSTRAINT `fk_msg_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `team_tasks`
--
ALTER TABLE `team_tasks`
  ADD CONSTRAINT `fk_task_assigned` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_task_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `ticket_messages`
--
ALTER TABLE `ticket_messages`
  ADD CONSTRAINT `fk_ticket_messages_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `fk_tx_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
