if (!db.test) {
  db.test = [
    {name: 'Aral', age: 44},
    {name: 'Laura', age: 32}
  ]
}

module.exports = function (request, response) {
  db.test.where('name').is('Aral').getFirst().age--
  db.test.where('name').is('Laura').getFirst().age++
  response.json(db.test)
}
