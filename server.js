const app = require('./src/app');

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  app.ready.then(() => {
    const server = app.listen(port, () => console.log(`Servidor em http://localhost:${port}`));
    server.on('error', error => {
      console.error('Não foi possível iniciar o servidor:', error.message);
      process.exitCode = 1;
    });
  }).catch(error => {
    console.error('Não foi possível carregar o banco:', error.message);
    process.exitCode = 1;
  });
}

module.exports = app;
