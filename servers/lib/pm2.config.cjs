const path = require('path');

module.exports = {
  apps : [
      {
        name: "libms",
        script: path.join(__dirname, 'dist/src/main.js'),
        cwd: __dirname,
        watch: false,
        args: `-H ${path.join(__dirname, 'config/http.json')}`
      }
  ]
}
