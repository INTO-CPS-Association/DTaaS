module.exports = {
  apps : [
      {
        name: "libms",
        script: "./dist/src/main.js",
        watch: false,
        args: "-H ./config/http.json"
      }
  ]
}
