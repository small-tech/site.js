module.exports = (request, response) => {
  response.json({
    personId: request.params.personId,
    bookId: request.params.bookId
  })
}
