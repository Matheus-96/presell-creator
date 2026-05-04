function startServer(app, { port, serviceName }) {
  return app.listen(port, () => {
    console.log(`${serviceName} running at http://localhost:${port}`);
  });
}

module.exports = startServer;
