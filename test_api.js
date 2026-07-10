const http = require('http');

const data = JSON.stringify({
  email: 'admin@pingforce.in',
  password: 'Admin@123',
  tenantCode: 'SYSTEM'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Login Status:', res.statusCode);
    const resData = JSON.parse(body);
    const token = resData.token;
    console.log('Token:', token ? 'Success' : 'Failed');
    
    if (token) {
      const permOpts = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/v1/rbac/permissions',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token,
          'X-Tenant-Id': 'tenant-uuid-placeholder' // Assuming we don't need real tenant for now or we just leave it out to test "SYSTEM"
        }
      };
      const req2 = http.request(permOpts, res2 => {
        let body2 = '';
        res2.on('data', chunk => body2 += chunk);
        res2.on('end', () => {
          console.log('GET /permissions Status:', res2.statusCode);
          console.log('Response:', body2);
          process.exit(0);
        });
      });
      req2.end();
    } else {
      console.log('Login failed:', body);
      process.exit(1);
    }
  });
});
req.write(data);
req.end();
