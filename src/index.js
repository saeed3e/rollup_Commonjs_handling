var layer = require('layer-websdk');

var client = new layer.Client({
    appId: "layer:///apps/staging/YOUR-APP-ID"
});

console.log(client)