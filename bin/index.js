import hass from 'homeassistant-ws';
import net from 'net';

async function main() {
  // connect to opaxos instance
  var opaxosClient = net.Socket();
  opaxosClient.setKeepAlive(true);
  await opaxosClient.connect(7080, '127.0.0.1', function() {
    console.log('connected to opaxos instance');
  });
  opaxosClient.on('data', function(data) {
    console.log('-> received: ' + data);
  });
  opaxosClient.on('close', function(e) {
    console.log('connection to opaxos instance is closed', e);
  });

  // connect to home-assistant
  var client = await hass.default({
    host: '192.168.64.3',
    port: 8123,
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI4MjQwYTc0N2I2ODg0YzdjODk1YzFmNDQ5ZDI5NzI1MSIsImlhdCI6MTY3MzM4MjEzOSwiZXhwIjoxOTg4NzQyMTM5fQ.YqCph2c77uWc4nyQUWkNpG19tb1DwW-sWnp8ig2y48o',
  });

  client.on('state_changed', (stateChangedEvent) => {
    // console.log(stateChangedEvent);

    // send state change to opaxos instance
    if (opaxosClient.readyState == 'open') {
      if (!stateChangedEvent && !stateChangedEvent.data && !stateChangedEvent.data.entity_id) return;
      console.log('--> sending put', stateChangedEvent.data.entity_id, stateChangedEvent.data.new_state.state, stateChangedEvent.time_fired);

      // format: command type (int8: 1 byte), command's length (uint32: 4 bytes), followed by the serialized command in bytes[]
      // CommandID (uint32: 4 bytes), SentAt (int64: 8 bytes)
      // Key (int32: 4 bytes), ValueLen (uint32: 4 bytes), Value (ValueLen bytes).
      const cmdKey = 123;
      const cmdVal = JSON.stringify(stateChangedEvent.data.new_state);
      const cmdValLen = cmdVal.length;
      const cmdType = 5; // TypeDBPutCommand (from db_command.go)
      const cmdLen = 20 + cmdValLen;
      const cmdID = 123;
      const cmdSentAt = 123;

      var cmdBuffer = Buffer.alloc(5 + cmdLen);
      cmdBuffer[0] = 0x5;                           // 1 byte command type
      cmdBuffer.writeUInt32BE(cmdLen, 1);           // 4 bytes command's length
      cmdBuffer.writeUInt32BE(cmdID, 5);            // 4 bytes command's ID
      // cmdBuffer.writeInt64BE(cmdSentAt, 9);      // 8 bytes command's Sent At
      cmdBuffer.writeInt32BE(cmdKey, 17);           // 4 bytes command's Key
      cmdBuffer.writeUInt32BE(cmdValLen, 21);       // 4 bytes command's Value Length
      cmdBuffer.write(cmdVal, 25, cmdValLen);       // valLen bytes command's Value

      opaxosClient.write(cmdBuffer);
      console.log(cmdBuffer.length, cmdLen, cmdValLen, cmdBuffer);
    }
  });
}

await main();