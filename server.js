const express = require('express')
const path = require('path')
const http = require('http')
const PORT = process.env.PORT || 3000
const socketio = require('socket.io')
const app = express()
const server = http.createServer(app)
const io = socketio(server)

// Set static folder
app.use(express.static(path.join(__dirname, "public")))

// Start server
server.listen(PORT, () => console.log(`Server running on port ${PORT}`))

// Handle a socket connection request from web client
const connections = [null, null]



io.on('connection', socket => {

  // Find an available player number
  socket.playerIndex = -1;
  for (const i in connections) {
    if (connections[i] === null) {
      socket.playerIndex = i
      break
    }
  }

  // Tell the connecting client what player number they are
  socket.emit('player-number', socket.playerIndex)

  console.log(`Player ${socket.playerIndex} has connected`)

  // Ignore player 3
  if (socket.playerIndex === -1) return

  connections[socket.playerIndex] = false

  socket.connection = "connected"
  // Tell eveyone what player number just connected
  socket.broadcast.emit('player-connection',socket.playerIndex)

  // Handle Diconnect
  socket.on('disconnect', () => {
    console.log(`Player ${socket.playerIndex} disconnected`)
    connections[socket.playerIndex] = null
    socket.connection = "disconnected"
    socket.broadcast.emit('player-lost',socket.playerIndex)
  })

  // On Ready
  socket.on('player-ready', () => {
    socket.broadcast.emit('enemy-ready', socket.playerIndex)
    connections[socket.playerIndex] = true
  })

  // Check player connections
  socket.on('check-players', () => {
    const players = []
    for (const i in connections) {
      connections[i] === null ? players.push({connected: false, ready: false}) : players.push({connected: true, ready: connections[i]})
    }
    socket.emit('check-players', players)
  })

  // On Fire Received
  socket.on('fire', id => {
    console.log(`Shot fired from ${socket.playerIndex}`, id)

    // Emit the move to the other player
    socket.broadcast.emit('fire', id)
  })

  // on Fire Reply
  socket.on('fire-reply', square => {
    console.log(square)

    // Forward the reply to the other player
    socket.broadcast.emit('fire-reply', square)
  })
})