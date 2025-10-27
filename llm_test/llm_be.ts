import http from 'http';

const PORT = 3001;

const server = http.createServer((req, res) => {
  console.log(`[Test LLM Server] Received ${req.method} request to ${req.url}`);
  
  // Return 429 status for ANY POST request (simulating rate limit)
  if (req.method === 'POST') {
    res.writeHead(429, { 
      'Content-Type': 'application/json',
      'Retry-After': '60'
    });
    res.end(JSON.stringify({
      error: {
        message: 'Rate limit exceeded',
        type: 'rate_limit_error',
        code: 'rate_limit_exceeded'
      }
    }));
    console.log('[Test LLM Server] Returned 429 status');
  } else {
    // Return 200 for GET requests (health check)
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', message: 'Test server is running' }));
  }
});

server.listen(PORT, () => {
  console.log(`[Test LLM Server] Server is running on http://localhost:${PORT}`);
  console.log(`[Test LLM Server] Simulating DeepSeek API with 429 status`);
  console.log(`[Test LLM Server] Endpoint: POST http://localhost:${PORT}/v1/chat/completions`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Test LLM Server] Shutting down...');
  server.close(() => {
    console.log('[Test LLM Server] Server closed');
    process.exit(0);
  });
});
