const request = require('supertest')
const express = require('express')

// Simple health check test
const app = express()

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
})

describe('Health Check API', () => {
  test('GET /api/health should return healthy status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200)

    expect(response.body).toHaveProperty('status', 'healthy')
    expect(response.body).toHaveProperty('timestamp')
    expect(response.body).toHaveProperty('environment')
  })

  test('Health endpoint should respond within 1 second', async () => {
    const start = Date.now()
    
    await request(app)
      .get('/api/health')
      .expect(200)
    
    const duration = Date.now() - start
    expect(duration).toBeLessThan(1000)
  })
})
