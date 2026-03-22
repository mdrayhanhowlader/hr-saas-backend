# Biometric Device Integration Guide

## How it works
Device → HTTP Push → Our API → Database

## API Endpoint
POST http://YOUR_SERVER:5000/api/attendance/biometric-punch

## Request Body
{
  "deviceId": "ZK-001",        // Device registered in system
  "biometricId": "123",        // Employee's biometric ID in profile
  "punchTime": "2026-03-22T09:00:00",
  "punchType": "IN"            // or "OUT"
}

## ZKTeco Setup
1. Device settings → Network → HTTP Push
2. URL: http://YOUR_IP:5000/api/attendance/biometric-punch
3. Format: JSON
4. Fields map: user_id → biometricId, time → punchTime

## Hikvision Setup
1. Access Control → Event Linkage → HTTP Upload
2. Same URL and JSON format

## Mobile Web Test (without real device)
Use: http://YOUR_IP:3000/mobile-punch
