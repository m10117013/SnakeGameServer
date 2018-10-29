var userCount = 0;

var snakes = [];
var fruits = [];

var gameWidth = 50;
var gameHeight = 100;

var gameStart = false;

var socketIO = [];

var timer;

var server = require('http').createServer();
var io = require('socket.io')(server);

var snakeColors = ["#00C77B","#C8C77A","#DE9B8A","#E2E3FD"];
var fruitColors = ["#FCE2FD","#c5fcdb"];

///snake model
var Snake = function(snakeName,x,y,direction) {
  var obj = {};
  obj.snakeID = snakeName;
  obj.nodes = [Node(x,y)];
  obj.score = 0;
  obj.isEliminate = false;
  obj.direction = direction;
  obj.overbounds = false;
  obj.move = function() {
  	    var length = this.nodes.length - 1;
  		var x =  this.nodes[length].x;
  		var y =  this.nodes[length].y;
  	   	switch (this.direction) {
	  	 	case 0:
	  	 		x = x - 1;
	  	 	break;
	  	 	case 1:
	  	 		x = x + 1;
	  	 	break;
	  	 	case 2:
	  	 		y = y - 1;
	  	 	break;
	  	 	case 3:
	  	 		y = y + 1;
	  	 	break;
	  	};
	  	this.nodes.push(Node(x,y));
	  	this.shadeTail = this.nodes.shift();
	  	if (x >= gameWidth || x < 0 || y >= gameHeight || y < 0) {
	  		this.overbounds = true;
	  	}
  };

  obj.isCrashOnSnake = function(node) {
  	var ret = false;
	this.nodes.forEach(function(element) {
		if (element.x == node.x && element.y == node.y) {
			console.log('crash');	
			ret = true;
		}
	});
	return ret;
  };

  obj.ateFoood = function() {
  	this.nodes.splice(0, 0, this.shadeTail);
  };

  obj.head = function() {
  	var length = this.nodes.length - 1;
  	return this.nodes[length];
  };
  
  // obj.x
  return obj;
};

///fruit model
var Fruit = function(x,y) { 
	var obj = {};
	obj.node = [Node(x,y)];
	return  obj;
}

//node
var Node = function(x,y) {
	var obj = {};
	obj.x = x;
	obj.y = y;
	return  obj;
};

//draw
var Drawable = function(nodes,color) {
	var obj = {};
	obj.node = nodes
	obj.color = color;
	return  obj;
};

function randomFood() {

	var existArray = [];

	snakes.forEach(function(snake) {
		existArray.concat(snake.nodes);
	});

	fruits.forEach(function(fruit) {
		existArray.concat(fruit.node);
	});
	var x = 0;
	var y = 0;
	var go = true
	while (go) {
		//會產生1~5之間的隨機亂數

		x = Math.floor(Math.random()*gameWidth);
		y = Math.floor(Math.random()*gameHeight);
		var found = true;
		for (var i = 0; i < existArray.length; i++ ) {
			if (existArray[i].x == x && existArray[i].y == y) {
				found = false;
				break;
			}
		};

		if (found) {
			go = false;
		}
	}

	console.log(x+'  '+y)
	return Fruit(x,y);
}


function gameRoop() {
	var datas = [];
	snakes.forEach(function(snake) {
		if (!snake.isEliminate) {
			//move
			snake.move();
			//eat fruits
			fruits.forEach(function(fruit) {
				var head = snake.head();
				if (fruit.node[0].x == head.x && fruit.node[0].y == head.y) {
					snake.ateFoood();
					snake.score += 10;
					fruits[0] = randomFood();
				}
			});
		}
	});

	for (var i = 0 ; i < snakes.length ; i ++) {
		for (var n = 0 ; n < snakes.length ; n ++) {
			if (i != n) {
				if (snakes[i].nodes.length > 0) {
					if (snakes[n].isCrashOnSnake(snakes[i].head())) {
							snakes[i].isEliminate = true;
							socketIO[i].emit('eliminate', {"1234":"123"});
							console.log(snakes[i].snakeID+" has eliminate");
					}
				}
			}

		}

	}

	//overbounds
	for (var i = 0 ; i < snakes.length ; i ++) {
			if (!snakes[i].isEliminate) {
			if (snakes[i].overbounds) {
				snakes[i].isEliminate = true;
				socketIO[i].emit('eliminate', {"1234":"123"});
				console.log(snakes[i].snakeID+" has eliminate");
			}	
		};
	};

	var gameOver = true;
	for (var i = 0 ; i < snakes.length ; i ++) {
		if (snakes[i].isEliminate == false) {
			datas.push(Drawable(snakes[i].nodes,snakeColors[i]));
			gameOver = false;
		} else {
			snakes[i].nodes = [];
		}
	};



	datas.push(Drawable(fruits[0].node,fruitColors[0]));
	io.emit('gameingData', datas );


	if (gameOver) {
		console.log('gameOver');
		gameStart = false;
	  	io.emit('gameover', snakes );
	  	clearInterval(timer);
	}
}

io.on('connection', function(client) {
	  //id 0 is host , onlu host can start game...
	  if (userCount == 0) {
	     client.emit('host', "hosting");
	  } else {
	  	 client.emit('player', "player");
	  }

	  //room is full
	  if (userCount >= 4) {
	  	 client.emit('roomFull', null);
	  	return;
	  } 

	  socketIO.push(client);

	  userCount = userCount + 1;

	  //to every one game start..
 	  io.emit('join', { count: userCount });

	  var snake = Snake('snake' + userCount,0,0,1);

 	  //call
 	  client.emit('snakeID', { ID: snake.snakeID , snakeColor : snakeColors[userCount-1] });

 	  //push
	  snakes.push(snake);

 	  //sent aera 
 	  client.emit('onAera', { width: gameWidth , height: gameHeight});
 	  
 	  //on move snake
	  client.on('move', function(data) {
	  	 var direction =  data['direct'];
	  	 if ((snake.direction == 0 && direction == 1) ||
	  	 	 (snake.direction == 1 && direction == 0) ||
	  	 	 (snake.direction == 2 && direction == 3) ||
	  	 	 (snake.direction == 3 && direction == 2)) {
	  	 	 	return;
		  }
	      snake.direction = direction;
	  });
	  
	  //disconnect
	  client.on('disconnect', function(){
		 userCount = userCount - 1;
		 snakes.pop()
		 console.log('disconnt');
	  });

	  client.on('start', function(){
	  	 io.emit('start', { count: 'go' });
         gameStart = true;
         fruits = [];
         for (var i = 0 ; i < snakes.length ; i ++) {
         	snakes[i].score = 0;
         	snakes[i].isEliminate = false;
         	snakes[i].overbounds = false;
         	if (i == 0) {
         		snakes[i].nodes = [Node(0,10)];
         		snakes[i].direction = 1;
         	} else if (i == 1) {
				snakes[i].nodes = [Node(gameWidth,10)];
         		snakes[i].direction = 0;
         	} else if (i == 2) {
         		snakes[i].nodes = [Node(0,gameHeight - 10)];
         		snakes[i].direction = 1;
         	} else if (i == 3) {
         		snakes[i].nodes = [Node(gameWidth,gameHeight - 10)];
         		snakes[i].direction = 0;
         	}

         };
	  	 fruits.push(randomFood()); 
	  	 timer = setInterval(gameRoop, 300);
		 console.log('start');
	  });	  
});
server.listen(8088);