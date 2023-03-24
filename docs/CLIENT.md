# Setting up the build

To implement the build on your server, follow these steps:

-   Locate the build folder `../client/build`. This folder contains all the optimized static files that are ready for deployment.

-   Copy the entire contents of the build folder to the root directory of your server where you want to deploy the app. You can use FTP, SFTP, or any other file transfer protocol to transfer the files.

-   Make sure your server is configured to serve static files. This can vary depending on the server technology you are using, but typically you will need to configure your server to serve files from a specific directory.

-   Once the files are on your server, you should be able to access your app by visiting your server's IP address or domain name in a web browser.

Note: If you are using a serverless architecture, such as AWS Lambda or Google Cloud Functions, you will need to follow the specific deployment instructions provided by your cloud provider.

---
