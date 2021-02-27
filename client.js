/*

Copyright © 2021 easrng (hello@easrng.us.to)

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files
(the “Software”), to deal in the Software without restriction,
including without limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of the Software,
and to permit persons to whom the Software is furnished to do so, 
subject to the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/
class CountEvent extends Event {
  constructor(name, count) {
    super(name);
    this.count = Number(count);
  }
}
class ScratchPushConnection {
  constructor(user) {
    this.user = user || undefined;
    this._count = null;
    this._sse == null;
    this._et = new EventTarget();
  }
  _connect() {
    if (this._sse) this._sse.close();
    this._count = null;
    this._sse = new EventSource(
      "https://scratch-push-server.glitch.me/user/" +
        encodeURIComponent(this._user)
    );
    this._sse.addEventListener("warn", e => {
      this._et.dispatchEvent(new ErrorEvent("warning", new Error(e.data)));
    });
    this._sse.addEventListener("terminate", e => {
      this._sse.close();
      this._sse = null;
      this._et.dispatchEvent(new ErrorEvent("error", new Error(e.data)));
    });
    this._sse.addEventListener("update", e => {
      let nc = parseInt(e.data);
      if (nc != this._count) {
        this._count = nc;
        this._et.dispatchEvent(new CountEvent("update", this._count));
      }
    });
  }
  get addEventListener() {
    return this._et.addEventListener.bind(this._et);
  }
  get removeEventListener() {
    return this._et.removeEventListener.bind(this._et);
  }
  get count() {
    return this._count;
  }
  get user() {
    return this._user;
  }
  set user(val) {
    if (typeof val == "string" && val) {
      this._user = val;
      this._connect();
    } else {
      this._user = null;
      this._sse.close();
    }
    return this._user;
  }
}
return ScratchPushConnection;
