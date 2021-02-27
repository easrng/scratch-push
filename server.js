/*
    A simple SSE server that polls  Scratch.
    Copyright (C) 2021 easrng (hi@easrng.us.to)

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

*/

const wrappers={umd:e=>`(function(root,factory){if(typeof define==='function'&&define.amd){define([],factory)}else if(typeof module==='object'&&module.exports){module.exports=factory()}else{root.ScratchPushConnection=factory()}}(typeof self!=='undefined'?self:this,function(){${e}}));`,esm:e=>`export default (function(){${e}})();`}

const fs = require("fs").promises;
const express = require("express");
const path = require("path");
const fetch = require("node-fetch");
const app = express();
const pThrottle = require("p-throttle");
const throttle = pThrottle({
  limit: 10,
  interval: 1000,
  strict: true
});

const throttledFetch = throttle(async user => {
  let r, j;
  try {
    r = await fetch(
      "https://api.scratch.mit.edu/users/" + user + "/messages/count"
    );
    if (!r.ok) throw new Error();
  } catch (e) {
    console.log(e);
    if (r && r.status == 404) throw new Error("ct:Invalid user");
    throw new Error("c:Failed to fetch");
  }
  try {
    j = await r.json();
    if (!j) throw new Error();
  } catch (e) {
    throw new Error("c:Scratch didn't send JSON");
  }
  return j
});

app.get("/:type/client.js", async (request, response, next) => {
  let wrap=wrappers[request.params.type]
  if(!wrap) next()
  response.header("Content-Type","text/javascript")
  response.send(wrap((await fs.readFile(path.join(__dirname,"client.js"))).toString()));
});

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  if ("OPTIONS" === req.method) {
    res.status(200);
    res.end();
  } else {
    next();
  }
});

app.get("/user/:user", function(req, res) {
  req.socket.setTimeout(0);
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive"
  });
  res.write("\n");
  let last = null;
  async function check() {
    let r, j;
    try {
      j = await throttledFetch(req.params.user);
      try {
        if (typeof j.count == "number") {
          if (j.count != last) {
            last = j.count;
            res.write("event: update\ndata: " + j.count + "\n\n");
          }
        } else {
          throw new Error("c:Invalid count");
        }
      } catch (e) {
        throw new Error("c:Issue sending");
      }
    } catch (e) {
      if (e.message.startsWith("c:")) {
        res.write("event: warn\ndata: " + e.message.slice(2) + "\n\n");
      }
      if (e.message.startsWith("ct:")) {
        res.write("event: terminate\ndata: " + e.message.slice(3) + "\n\n");
        res.end();
      }
    }
  }
  let udi = setInterval(check, 30 * 1000);
  check();
  let pi = setInterval(async function() {
    res.write("event: ping\ndata: ping pong\n\n");
  }, 2000);
  req.on("close", function() {
    clearInterval(udi);
  });
});

const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
