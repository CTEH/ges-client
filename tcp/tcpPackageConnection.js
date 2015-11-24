var net = require('net')
	, util = require('util')
	, EventEmitter = require('events').EventEmitter
	, framer = require('./lengthPrefixMessageFramer')
	, messageReceiver = require('./messageReceiver')

module.exports = TcpPackageConnection


function TcpPackageConnection(opts) {
	if(!(this instanceof TcpPackageConnection)) {
		return new TcpPackageConnection(opts)
	}

	EventEmitter.call(this)

	var socket = net.connect(opts.endPoint)
		, closeCallbacks = []
		, receiver = messageReceiver()
		, me = this

	socket.on('connect', function() {
		me.emit.apply(me, ['connect'].concat(Array.prototype.slice.call(arguments, 0)))
	})

	socket.on('data', function(data) {
		receiver.processData(data)
	})

	socket.on('error', function() {
		me.emit.apply(me, ['error'].concat(Array.prototype.slice.call(arguments, 0)))
	})

	socket.on('close', function(result) {
		closeCallbacks.forEach(function(cb) {
			cb(null)
		})
		me.emit.call(me, 'close', result)
	})

	receiver.on('message', function(message) {
		me.emit('package', {
			connection: me
		, package: message
		})
	})

	this._socket = socket
	this._closeCallbacks = closeCallbacks
	
	this.remoteEndpoint = opts.endPoint
}
util.inherits(TcpPackageConnection, EventEmitter)


TcpPackageConnection.prototype.cleanup = function() {
	this.removeAllListeners()
}

TcpPackageConnection.prototype.close = function(reason, cb) {
	//BLM: TODO - Compare this to C#
	this._closeCallbacks.push(cb)
	this._socket.destroy()
}

TcpPackageConnection.prototype.enqueueSend = function(packetData) {
	var packet = framer.frame(packetData.messageName, packetData.correlationId, packetData.payload, packetData.userCredentials)

	this._socket.write(packet)
}
