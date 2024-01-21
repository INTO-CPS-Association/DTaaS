module.exports = {
  apps : [
      {
        name: "libms",
        script: "./dist/src/main.js",
        watch: false,
        args: "-c .env -f ./config/cloudcmd.json"
      }
  ]
}
