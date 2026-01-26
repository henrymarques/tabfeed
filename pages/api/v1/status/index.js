function status(request, response) {
  response
    .status(200)
    .setHeader("content-type", "text/plain; charset=utf-8")
    .send("Olá, mundo!");
}

export default status;
