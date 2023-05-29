# SpeedTest Simulator

The application consists of two layers:

- Server Application
- Client Application

The server application is a small python application. It should be installed to a server. You can use docker-compose to create a container and always-running service.
The best usage is to put this app behind a reverse-proxy server like nginx which can handle TLS negotiation.

The client application is a client-side application which was developed with Typescript and React framework. The client application downloads from and uploads to the server application
to monitor the traffic and computing the statistics.

You can change the download and upload endpoint URL's in the appsettins.js file. Also, there are some important parameters in the constants.ts file.

To run the client side application, you can run `npm install` to install the npm packages and `npm run start` to run the project in the root of the project folder using your terminal.