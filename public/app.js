document.addEventListener('DOMContentLoaded', () => {
  const userGrid = document.querySelector('.grid-user')
  const computerGrid = document.querySelector('.grid-computer')
  const displayGrid = document.querySelector('.grid-display')
  const ships = document.querySelectorAll('.ship')
  const destroyer = document.querySelector('.destroyer-container')
  const submarine = document.querySelector('.submarine-container')
  const cruiser = document.querySelector('.cruiser-container')
  const battleship = document.querySelector('.battleship-container')
  const carrier = document.querySelector('.carrier-container')
  const startButton = document.querySelector('#start')
  const rotateButton = document.querySelector('#rotate')
  const turnDisplay = document.querySelector('#whose-go')
  const infoDisplay = document.querySelector('#info')
  const setupButtons = document.querySelector('.setup-buttons')
  const userSquares = []
  const computerSquares = []
  let isHorizontal = true
  let isGameOver = false
  let currentPlayer = 'user'
  const width = 10
  let playerNum = 0
  let ready = false
  let enemyReady = false
  let allShipsPlaced = false
  let shotFired = -1
  
  //Ships
  const shipArray = [
    {
      name: 'destroyer',
      directions: [
        [0, 1],
        [0, width]
      ]
    },
    {
      name: 'submarine',
      directions: [
        [0, 1, 2],
        [0, width, width * 2]
      ]
    },
    {
      name: 'cruiser',
      directions: [
        [0, 1, 2],
        [0, width, width * 2]
      ]
    },
    {
      name: 'battleship',
      directions: [
        [0, 1, 2, 3],
        [0, width, width * 2, width * 3]
      ]
    },
    {
      name: 'carrier',
      directions: [
        [0, 1, 2, 3, 4],
        [0, width, width * 2, width * 3, width * 4]
      ]
    },
  ]

  createBoard(userGrid, userSquares)
  createBoard(computerGrid, computerSquares)

  // Select Player Mode
  if (gameMode === 'singlePlayer') {
    startSinglePlayer()
  } else {
    startMultiPlayer()
  }

  // Multiplayer
  function startMultiPlayer() {
    const socket = io();

    // Get your player number
    socket.on('player-number', num => {
      if (num === -1) {
        infoDisplay.innerHTML = "Sorry, the server is full"
      } else {
        playerNum = parseInt(num)
        if (playerNum === 1) currentPlayer = "enemy"

        console.log(playerNum)

        // Get other player status
        socket.emit('check-players')
      }
    })

    // Another player has connected or disconnected
    socket.on('player-connection', num => {
      console.log(`Player number ${num} has connected or disconnected`)
      playerConnectedOrDisconnected(num)
    })

    socket.on('player-lost', num => {
      //player disconnected
      console.log(num)
      playerConnectedOrDisconnected(num)
      infoDisplay.textContent = "Refresh to start the new game"
    })

    // Check player status
    socket.on('check-players', players => {
      players.forEach((p, i) => {
        if (p.connected) playerConnectedOrDisconnected(i)
        if (p.ready) {
          playerReady(i)
          if (i !== playerReady) enemyReady = true
        }
      })
    })


    // On enemy ready
    socket.on('enemy-ready', num => {
      enemyReady = true
      playerReady(num)
      if (ready) {
        playGameMulti(socket)
        setupButtons.style.display = 'none'
      }
    })


    // Ready button click
    startButton.addEventListener('click', () => {
      if (allShipsPlaced) {
        infoDisplay.textContent = ""
        playGameMulti(socket)
      }
      else infoDisplay.textContent = "Please place all ships"
    })

    // Setup event listeners for firing
    computerSquares.forEach(square => {
      square.addEventListener('click', () => {
        if (currentPlayer === 'user' && ready && enemyReady) {
          shotFired = square.dataset.id
          const enemySquare = computerGrid.querySelector(`div[data-id='${shotFired}']`)
          if (shotFired &&  !enemySquare.classList.contains('visited')) {
            socket.emit('fire', shotFired)
          }
        }
      })
    })

    // On Fire Received
    socket.on('fire', id => {
      enemyGo(id)
      const square = userSquares[id]
      socket.emit('fire-reply', square.classList)
      playGameMulti(socket)
    })

    // On Fire Reply Received
    socket.on('fire-reply', classList => {
      revealSquare(classList)
      playGameMulti(socket)
    })

    function playerConnectedOrDisconnected(num) {
      let player = `.p${parseInt(num) + 1}`
      if (!document.querySelector(`${player} .connected`).classList.contains('active')) {
        document.querySelector(`${player} .connected`).classList.add('active')
      }
      else {
        document.querySelector(`${player} .connected`).classList.remove('active')
        document.querySelector(`${player} .ready`).classList.remove('active')
      }
      if (parseInt(num) === playerNum) document.querySelector(player).style.fontWeight = 'bold'
    }
  }

  // Single Player
  function startSinglePlayer() {
    generate(shipArray[0])
    generate(shipArray[1])
    generate(shipArray[2])
    generate(shipArray[3])
    generate(shipArray[4])

    startButton.addEventListener('click', () => {
      if (allShipsPlaced) {
        setupButtons.style.display = 'none'
        infoDisplay.textContent = ""
        playGameSingle()
      }
      else {
        infoDisplay.textContent = "Please place all ships"

      }

    })
  }

  //Create Board
  function createBoard(grid, squares) {
    for (let i = 0; i < width * width; i++) {
      const square = document.createElement('div')
      square.dataset.id = i
      grid.appendChild(square)
      squares.push(square)
    }
  }

  //Draw the computers ships in random locations
  function generate(ship) {
    let randomDirection = Math.floor(Math.random() * ship.directions.length)
    let current = ship.directions[randomDirection]
    if (randomDirection === 0) direction = 1
    if (randomDirection === 1) direction = 10
    let randomStart = Math.abs(Math.floor(Math.random() * computerSquares.length - (ship.directions[0].length * direction)))

    const isTaken = current.some(index => computerSquares[randomStart + index].classList.contains('taken'))
    const isAtRightEdge = current.some(index => (randomStart + index) % width === width - 1)
    const isAtLeftEdge = current.some(index => (randomStart + index) % width === 0)

    if (!isTaken && !isAtRightEdge && !isAtLeftEdge) current.forEach(index => computerSquares[randomStart + index].classList.add('taken', ship.name))

    else generate(ship)
  }


  //Rotate the ships
  function rotate() {
    if (isHorizontal) {
      destroyer.classList.toggle('destroyer-container-vertical')
      submarine.classList.toggle('submarine-container-vertical')
      cruiser.classList.toggle('cruiser-container-vertical')
      battleship.classList.toggle('battleship-container-vertical')
      carrier.classList.toggle('carrier-container-vertical')
      isHorizontal = false
      // console.log(isHorizontal)
      return
    }
    if (!isHorizontal) {
      destroyer.classList.toggle('destroyer-container-vertical')
      submarine.classList.toggle('submarine-container-vertical')
      cruiser.classList.toggle('cruiser-container-vertical')
      battleship.classList.toggle('battleship-container-vertical')
      carrier.classList.toggle('carrier-container-vertical')
      isHorizontal = true
      // console.log(isHorizontal)
      return
    }
  }
  rotateButton.addEventListener('click', rotate)

  //move around user ship
  ships.forEach(ship => ship.addEventListener('dragstart', dragStart))
  userSquares.forEach(square => square.addEventListener('dragstart', dragStart))
  userSquares.forEach(square => square.addEventListener('dragover', dragOver))
  userSquares.forEach(square => square.addEventListener('dragenter', dragEnter))
  userSquares.forEach(square => square.addEventListener('dragleave', dragLeave))
  userSquares.forEach(square => square.addEventListener('drop', dragDrop))
  userSquares.forEach(square => square.addEventListener('dragend', dragEnd))

  let selectedShipNameWithIndex
  let draggedShip
  let draggedShipLength

  ships.forEach(ship => ship.addEventListener('mousedown', (e) => {
    selectedShipNameWithIndex = e.target.id
    // console.log(selectedShipNameWithIndex)
  }))

  function dragStart() {
    draggedShip = this
    draggedShipLength = this.childNodes.length
    // console.log(draggedShip)
  }

  function dragOver(e) {
    e.preventDefault()
  }

  function dragEnter(e) {
    e.preventDefault()
  }

  function dragLeave() {
    // console.log('drag leave')
  }

  function dragDrop() {
    let shipNameWithLastId = draggedShip.lastChild.id
    let shipClass = shipNameWithLastId.slice(0, -2)
    // console.log(shipClass)
    let lastShipIndex = parseInt(shipNameWithLastId.substr(-1))
    let shipLastId = lastShipIndex + parseInt(this.dataset.id)
    // console.log(shipLastId)
    const notAllowedHorizontal = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 1, 11, 21, 31, 41, 51, 61, 71, 81, 91, 2, 22, 32, 42, 52, 62, 72, 82, 92, 3, 13, 23, 33, 43, 53, 63, 73, 83, 93]
    const notAllowedVertical = [99, 98, 97, 96, 95, 94, 93, 92, 91, 90, 89, 88, 87, 86, 85, 84, 83, 82, 81, 80, 79, 78, 77, 76, 75, 74, 73, 72, 71, 70, 69, 68, 67, 66, 65, 64, 63, 62, 61, 60]

    let newNotAllowedHorizontal = notAllowedHorizontal.splice(0, 10 * lastShipIndex)
    let newNotAllowedVertical = notAllowedVertical.splice(0, 10 * lastShipIndex)

    selectedShipIndex = parseInt(selectedShipNameWithIndex.substr(-1))

    shipLastId = shipLastId - selectedShipIndex
    // console.log(shipLastId)

    if (isHorizontal && !newNotAllowedHorizontal.includes(shipLastId)) {
      for (let i = 0; i < draggedShipLength; i++) {
        if (userSquares[parseInt(this.dataset.id) - selectedShipIndex + i].classList.contains('taken')) {
          console.log("Ship already present")
          return
        }
      }
    }

    else if (!isHorizontal && !newNotAllowedVertical.includes(shipLastId)) {
      for (let i = 0; i < draggedShipLength; i++) {
        if (userSquares[parseInt(this.dataset.id) - selectedShipIndex + width * i].classList.contains('taken')) {
          console.log("Ship already present")
          return
        }
      }
    }

    if (isHorizontal && !newNotAllowedHorizontal.includes(shipLastId)) {
      for (let i = 0; i < draggedShipLength; i++) {
        let directionClass
        if (i === 0) directionClass = 'start'
        if (i === draggedShipLength - 1) directionClass = 'end'
        userSquares[parseInt(this.dataset.id) - selectedShipIndex + i].classList.add('taken', 'horizontal', directionClass, shipClass)
      }
      //As long as the index of the ship you are dragging is not in the newNotAllowedVertical array! This means that sometimes if you drag the ship by its
      //index-1 , index-2 and so on, the ship will rebound back to the displayGrid.
    } else if (!isHorizontal && !newNotAllowedVertical.includes(shipLastId)) {
      for (let i = 0; i < draggedShipLength; i++) {
        let directionClass
        if (i === 0) directionClass = 'start'
        if (i === draggedShipLength - 1) directionClass = 'end'
        userSquares[parseInt(this.dataset.id) - selectedShipIndex + width * i].classList.add('taken', 'vertical', directionClass, shipClass)
      }
    } else return

    displayGrid.removeChild(draggedShip)
    if (!displayGrid.querySelector('.ship')) allShipsPlaced = true
  }

  function dragEnd() {
    // console.log('dragend')
  }

  // Game Logic for MultiPlayer
  function playGameMulti(socket) {
    setupButtons.style.display = 'none'
    if (isGameOver) return
    //setting current player as ready
    if (!ready) {
      socket.emit('player-ready')
      ready = true
      playerReady(playerNum)
    }

    if (enemyReady) {
      if (currentPlayer === 'user') {
        turnDisplay.innerHTML = 'Your Go'
      }
      if (currentPlayer === 'enemy') {
        turnDisplay.innerHTML = "Enemy's Go"
      }
    }
  }

  function playerReady(num) {
    let player = `.p${parseInt(num) + 1}`
    document.querySelector(`${player} .ready`).classList.toggle('active')
  }

  // Game Logic for Single Player
  function playGameSingle() {
    if (isGameOver) return
    if (currentPlayer === 'user') {
      turnDisplay.innerHTML = 'Your Go'
      computerSquares.forEach(square => square.addEventListener('click', function (e) {
        shotFired = square.dataset.id
        const enemySquare = computerGrid.querySelector(`div[data-id='${shotFired}']`)
        if(shotFired && !enemySquare.classList.contains('visited'))
        {
          revealSquare(square.classList)
        }  
      }))
    }
    if (currentPlayer === 'enemy') {
      turnDisplay.innerHTML = 'Computers Go'
      setTimeout(enemyGo, 300)
    }
  }

  let destroyerCount = 0
  let submarineCount = 0
  let cruiserCount = 0
  let battleshipCount = 0
  let carrierCount = 0

  //for user's empty grid(not filled with ship)
  function revealSquare(classList) {
    let audio_container = document.querySelector('.audio_container')
    let ele = document.querySelector('.storer')
    let show = document.querySelector('.show')
    let same_person = false
    const enemySquare = computerGrid.querySelector(`div[data-id='${shotFired}']`)
    enemySquare.classList.add('visited')
    const obj = Object.values(classList)
    if (!enemySquare.classList.contains('boom') && currentPlayer === 'user' && !isGameOver) {
      if (obj.includes('destroyer')) {
        destroyerCount++
        if (gameMode != 'singlePlayer') {
          same_person = destroyerCount == 2 ? false : true
          if(destroyerCount == 2){
            setTimeout(()=>{
              ele.innerHTML = `<div class = "page">
              <div style="height:25%"></div>
              <div class = "bloom">
                <div class = "new_font">
                  YOU DESTROYED ENEMY'S DESTROYER
                </div>
              </div>
              <div style="height:25%"></div>
          </div>`
          show.style.display = "none"
            },250)
            setTimeout(()=>{
              ele.innerHTML = ""
            },4250)
            setTimeout(()=>{
              show.style.display = "block"
            },4300)
          }
          
        }
      }
      if (obj.includes('submarine')) {
        submarineCount++
        if (gameMode != 'singlePlayer') {
          same_person = submarineCount == 3 ? false : true
          if(submarineCount == 3){
            setTimeout(()=>{
              ele.innerHTML = `<div class = "page">
              <div style="height:25%"></div>
              <div class = "bloom">
                <div class = "new_font">
                  YOU DESTROYED ENEMY'S SUBMARINE
                </div>
              </div>
              <div style="height:25%"></div>
          </div>`
          show.style.display = "none"
            },250)
            setTimeout(()=>{
              ele.innerHTML = ""
            },4250)
            setTimeout(()=>{
              show.style.display = "block"
            },4300)
          }
        }
      }
      if (obj.includes('cruiser')) {
        cruiserCount++
        if (gameMode != 'singlePlayer') {
          same_person = cruiserCount == 3 ? false : true
          if(cruiserCount == 3){
            setTimeout(()=>{
              ele.innerHTML = `<div class = "page">
              <div style="height:25%"></div>
              <div class = "bloom">
                <div class = "new_font">
                  YOU DESTROYED ENEMY'S CRUISER
                </div>
              </div>
              <div style="height:25%"></div>
          </div>`
          show.style.display = "none"
            },250)
            setTimeout(()=>{
              ele.innerHTML = ""
            },4250)
            setTimeout(()=>{
              show.style.display = "block"
            },4300)
          }
        }
      }
      if (obj.includes('battleship')) {
        battleshipCount++
        if (gameMode != 'singlePlayer') {
          same_person = battleshipCount == 4 ? false : true
          if(battleshipCount == 4){
            setTimeout(()=>{
              ele.innerHTML = `<div class = "page">
              <div style="height:25%"></div>
              <div class = "bloom">
                <div class = "new_font">
                  YOU DESTROYED ENEMY'S BATTLESHIP
                </div>
              </div>
              <div style="height:25%"></div>
          </div>`
          show.style.display = "none"
            },250)
            setTimeout(()=>{
              ele.innerHTML = ""
            },4250)
            setTimeout(()=>{
              show.style.display = "block"
            },4300)
          }
        }
      }
      if (obj.includes('carrier')) {
        carrierCount++
        if (gameMode != 'singlePlayer') {
          same_person = carrierCount == 5 ? false : true
          if(carrierCount == 5){
            setTimeout(()=>{
              ele.innerHTML = `<div class = "page">
              <div style="height:25%"></div>
              <div class = "bloom">
                <div class = "new_font">
                  YOU DESTROYED ENEMY'S CARRIER
                </div>
              </div>
              <div style="height:25%"></div>
          </div>`
          show.style.display = "none"
            },250)
            setTimeout(()=>{
              ele.innerHTML = ""
            },4250)
            setTimeout(()=>{
              show.style.display = "block"
            },4300)
          }
        }
      }
    }
    if (obj.includes('taken')) {
      audio_container.innerHTML = `<audio src="./audio/blast_square.mp3" autoplay></audio>`
        setTimeout(()=>{
          audio_container.innerHTML = ""
        },3000)
      enemySquare.classList.add('boom')
    } else {
      audio_container.innerHTML = `<audio src="./audio/droplet.mp3" autoplay></audio>`
        setTimeout(()=>{
          audio_container.innerHTML = ""
        },500)
      enemySquare.classList.add('miss')
    }
    checkForWins()
    if (same_person) {
      currentPlayer = 'user'
      turnDisplay.innerHTML = 'Your Go'
    }
    else {
      currentPlayer = 'enemy'
      turnDisplay.innerHTML = "Enemy's Go"
    }

    if (gameMode === 'singlePlayer') playGameSingle()
  }

  let cpuDestroyerCount = 0
  let cpuSubmarineCount = 0
  let cpuCruiserCount = 0
  let cpuBattleshipCount = 0
  let cpuCarrierCount = 0

  // enemy board checking 
  //if target hitted then enemy remains enemy only
  function enemyGo(square) {
    let same_person = false
    let ele = document.querySelector('.storer')
    let show = document.querySelector('.show')
    let audio_container = document.querySelector('.audio_container')
    if (gameMode === 'singlePlayer') square = Math.floor(Math.random() * userSquares.length)
    if (!userSquares[square].classList.contains('boom')) {
      const hit = userSquares[square].classList.contains('taken')
      if(!hit){
        audio_container.innerHTML = `<audio src="./audio/droplet.mp3" autoplay></audio>`
        setTimeout(()=>{
          audio_container.innerHTML = ""
        },500)
      }
      else{
        audio_container.innerHTML = `<audio src="./audio/blast_square.mp3" autoplay></audio>`
        setTimeout(()=>{
          audio_container.innerHTML = ""
        },3000)
      }
      userSquares[square].classList.add(hit ? 'boom' : 'miss')
      if (userSquares[square].classList.contains('destroyer')) {
        cpuDestroyerCount++
        if (gameMode != 'singlePlayer') {
          same_person = cpuDestroyerCount == 2 ? false : true
          if(cpuDestroyerCount == 2){
            let k = `<div class = "big-background"><div class = "coloring"></div><div class = "bloom"><div class = "change_font">ENEMY DESTROYED YOUR DESTROYER</div></div><div class = "coloring"></div></div>`
            ele.innerHTML = k
            show.style.display = "none"
            console.log(ele)
            setTimeout(()=>{
              ele.innerHTML = ""
            },4000)
            setTimeout(()=>{
              show.style.display = "block"
            },4050)
          }
        }
      }
      if (userSquares[square].classList.contains('submarine')) {
        cpuSubmarineCount++
        if (gameMode != 'singlePlayer') {
          same_person = cpuSubmarineCount == 3 ? false : true
          if(cpuSubmarineCount == 3){
            let k = `<div class = "big-background"><div class = "coloring"></div><div class = "bloom"><div class = "change_font">ENEMY DESTROYED YOUR SUBMARINE</div></div><div class = "coloring"></div></div>`
            ele.innerHTML = k
            show.style.display = "none"
            console.log(ele)
            setTimeout(()=>{
              ele.innerHTML = ""
            },4000)
            setTimeout(()=>{
              show.style.display = "block"
            },4050)
          }
        }
      }
      if (userSquares[square].classList.contains('cruiser')) {
        cpuCruiserCount++
        if (gameMode != 'singlePlayer') {
          same_person = cpuCruiserCount == 3 ? false : true
          if(cpuCruiserCount == 3){
            let k = `<div class = "big-background"><div class = "coloring"></div><div class = "bloom"><div class = "change_font">ENEMY DESTROYED YOUR CRUISER</div></div><div class = "coloring"></div></div>`
            ele.innerHTML = k
            show.style.display = "none"
            console.log(ele)
            setTimeout(()=>{
              ele.innerHTML = ""
            },4000)
            setTimeout(()=>{
              show.style.display = "block"
            },4050)
          }
        }

      }
      if (userSquares[square].classList.contains('battleship')) {
        cpuBattleshipCount++
        if (gameMode != 'singlePlayer') {
          same_person = cpuBattleshipCount == 4 ? false : true
          if(cpuBattleshipCount == 4){
            let k = `<div class = "big-background"><div class = "coloring"></div><div class = "bloom"><div class = "change_font">ENEMY DESTROYED YOUR BATTLESHIP</div></div><div class = "coloring"></div></div>`
            ele.innerHTML = k
            show.style.display = "none"
            console.log(ele)
            setTimeout(()=>{
              ele.innerHTML = ""
            },4000)
            setTimeout(()=>{
              show.style.display = "block"
            },4050)
          }
        }

      }
      if (userSquares[square].classList.contains('carrier')) {
        cpuCarrierCount++
        if (gameMode != 'singlePlayer') {
          same_person = cpuCarrierCount == 5 ? false : true
          if(cpuCarrierCount == 5){
            let k = `<div class = "big-background"><div class = "coloring"></div><div class = "bloom"><div class = "change_font">ENEMY DESTROYED YOUR CARRIER</div></div><div class = "coloring"></div></div>`
            ele.innerHTML = k
            show.style.display = "none"
            console.log(ele)
            setTimeout(()=>{
              ele.innerHTML = ""
            },4000)
            setTimeout(()=>{
              show.style.display = "block"
            },4050)
          }
        }
      }

      checkForWins()
    } else if (gameMode === 'singlePlayer') enemyGo()
    if (same_person) {
      currentPlayer = 'enemy'
      turnDisplay.innerHTML = "Enemy's Go"
    }
    else {
      currentPlayer = 'user'
      turnDisplay.innerHTML = 'Your Go'
    }

  }

  function checkForWins() {
    let enemy = 'computer'
    if (gameMode === 'multiPlayer') enemy = 'enemy'
    if (destroyerCount === 2) {
      infoDisplay.innerHTML = `YOU DESTROYED ${enemy.toUpperCase()}'S DESTROYER`
      destroyerCount = 10
    }
    if (submarineCount === 3) {
      infoDisplay.innerHTML = `YOU DESTROYED ${enemy.toUpperCase()}'S SUBMARINE`
      submarineCount = 10
    }
    if (cruiserCount === 3) {
      infoDisplay.innerHTML = `YOU DESTROYED ${enemy.toUpperCase()}'S CRUISER`
      cruiserCount = 10
    }
    if (battleshipCount === 4) {
      infoDisplay.innerHTML = `YOU DESTROYED ${enemy.toUpperCase()}'S BATTLESHIP`
      battleshipCount = 10
    }
    if (carrierCount === 5) {
      infoDisplay.innerHTML = `YOU DESTROYED ${enemy.toUpperCase()}'S CARRIER`
      carrierCount = 10
    }
    if (cpuDestroyerCount === 2) {
      infoDisplay.innerHTML = `${enemy.toUpperCase()} DESTROYED YOUR DESTROYER`
      cpuDestroyerCount = 10
    }
    if (cpuSubmarineCount === 3) {
      infoDisplay.innerHTML = `${enemy.toUpperCase()} DESTROYED YOUR SUBMARINE`
      cpuSubmarineCount = 10
    }
    if (cpuCruiserCount === 3) {
      infoDisplay.innerHTML = `${enemy.toUpperCase()} DESTROYED YOUR CRUSIER`
      cpuCruiserCount = 10
    }
    if (cpuBattleshipCount === 4) {
      infoDisplay.innerHTML = `${enemy.toUpperCase()} DESTROYED YOUR BATTLESHIP`
      cpuBattleshipCount = 10
    }
    if (cpuCarrierCount === 5) {
      infoDisplay.innerHTML = `${enemy.toUpperCase()} DESTROYED YOUR CARRIER`
      cpuCarrierCount = 10
    }

    if ((destroyerCount + submarineCount + cruiserCount + battleshipCount + carrierCount) === 50) {
      infoDisplay.innerHTML = "YOU WIN"
      gameOver()
    }
    if ((cpuDestroyerCount + cpuSubmarineCount + cpuCruiserCount + cpuBattleshipCount + cpuCarrierCount) === 50) {
      infoDisplay.innerHTML = `${enemy.toUpperCase()} WINS`
      gameOver()
    }
  }

  function gameOver() {
    isGameOver = true
    startButton.removeEventListener('click', playGameSingle)
  }
})