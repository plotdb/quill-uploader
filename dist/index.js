(function(){
  var quillUploader, ref$;
  quillUploader = function(o){
    o == null && (o = {});
    this._quill = o.editor;
    this._sig = {};
    this._evthdr = {};
    this._upload = o.upload;
    this._progress = o.progress || function(){};
    this.handler = {
      upload: this._handler.upload.bind(this),
      change: this._handler.change.bind(this)
    };
    return this;
  };
  quillUploader.prototype = (ref$ = Object.create(Object.prototype), ref$.on = function(n, cb){
    var this$ = this;
    return (Array.isArray(n)
      ? n
      : [n]).map(function(n){
      var ref$;
      return ((ref$ = this$._evthdr)[n] || (ref$[n] = [])).push(cb);
    });
  }, ref$.fire = function(n){
    var v, res$, i$, to$, ref$, len$, cb, results$ = [];
    res$ = [];
    for (i$ = 1, to$ = arguments.length; i$ < to$; ++i$) {
      res$.push(arguments[i$]);
    }
    v = res$;
    for (i$ = 0, len$ = (ref$ = this._evthdr[n] || []).length; i$ < len$; ++i$) {
      cb = ref$[i$];
      results$.push(cb.apply(this, v));
    }
    return results$;
  }, ref$.editor = function(it){
    if (arguments.length) {
      return this._quill = it;
    } else {
      return this._quill;
    }
  }, ref$.needUpload = function(url){
    url == null && (url = "");
    return !!(/data:image/.exec(url) && !this._sig[this.sig(url)]);
  }, ref$.sig = function(url){
    return (url || '').substring(0, 64);
  }, ref$.key = function(){
    return Math.random().toString(36).substring(2) + "-" + Date.now();
  }, ref$.insert = function(o){
    var nd, ret, this$ = this;
    nd = this._quill.getContents();
    ret = nd.ops.filter(function(op){
      return o.sig === this$.sig((op.insert || {}).image)
        ? (op.insert.image = o.file.url, true)
        : "#" + o.sig === this$.sig((op.attributes || {}).link) ? (op.attributes.link = o.file.url, op.insert = o.file.url, true) : false;
    });
    if (ret.length) {
      return this._quill.setContents(nd);
    }
  }, ref$._ld = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" width="96" height="96" style="background:#fafafa"><g><circle stroke-dasharray="131.95 45.98" r="28" stroke-width="8" stroke="#d7d7d7" fill="none" cy="50" cx="50"><animateTransform keyTimes="0;1" values="0 50 50;360 50 50" dur="1s" repeatCount="indefinite" type="rotate" attributeName="transform"></animateTransform></circle></g></svg>', ref$.uploadFiles = function(files, insert){
    files == null && (files = []);
    return this._uploadFiles(files, insert, 0);
  }, ref$._uploadFiles = function(files, insert, idx, ext){
    var file, this$ = this;
    ext == null && (ext = {});
    file = files[idx];
    if (!file) {
      return Promise.resolve();
    }
    return Promise.resolve().then(function(){
      return this$._upload({
        file: file.blob,
        progress: this$._progress
      });
    }).then(function(f){
      var ref$;
      f = [(ref$ = import$({}, f), ref$.blob = file.blob, ref$)];
      if (ext.detail) {
        return ext.detail(f);
      } else {
        return Promise.resolve(f);
      }
    }).then(function(f){
      f = f[0];
      delete f.blob;
      this$.fire('uploaded', f);
      if (insert) {
        insert((file.file = f, file));
      }
      return this$._uploadFiles(files, insert, idx + 1, ext);
    });
  }, ref$.convertImages = function(list){
    var ps;
    ps = list.map(function(o){
      return ldfile.fromURL(o.image, 'blob').then(function(r){
        return {
          blob: r.file,
          sig: o.sig
        };
      });
    });
    return Promise.all(ps);
  }, ref$._handler = {
    upload: function(opt){
      var this$ = this;
      opt == null && (opt = {});
      return function(){
        var input;
        input = document.createElement('input');
        input.setAttribute('type', 'file');
        if (opt.type === 'image') {
          input.setAttribute('accept', 'image/png, image/gif, image/jpeg');
        }
        input.onchange = function(){
          var ext, files, key, placeholder, sig;
          ext = {};
          files = input.files;
          if (!(files && files.length)) {
            return;
          }
          files = [files[0]];
          input.value = null;
          key = this$.key();
          if (opt.type === 'image') {
            placeholder = "data:image/svg+xml;base64," + btoa("<svg data-key=\"" + key + "\" " + this$._ld);
            sig = this$.sig(placeholder);
            this$._sig[sig] = true;
            this$._quill.insertEmbed(this$._quill.getSelection().index, 'image', placeholder);
          } else {
            sig = this$.sig(key);
            this$._sig[sig] = true;
            this$._quill.insertText(this$._quill.getSelection().index, sig, {
              link: "#" + sig
            });
          }
          return this$.uploadFiles(files.map(function(blob){
            return {
              blob: blob,
              sig: sig
            };
          }), this$.insert.bind(this$));
        };
        return input.click();
      };
    },
    change: function(delta, oldDetail, src){
      var this$ = this;
      return Promise.resolve().then(function(){
        var hash, list, nd;
        hash = {};
        list = delta.ops.filter(function(o){
          return this$.needUpload((o.insert || {}).image);
        }).map(function(o){
          var key, image, placeholder, sig;
          key = this$.key();
          image = o.insert.image;
          placeholder = "data:image/svg+xml;base64," + btoa("<svg data-key=\"" + key + "\" " + this$._ld);
          sig = this$.sig(placeholder);
          this$._sig[sig] = true;
          return hash[image] = {
            sig: sig,
            image: image,
            placeholder: placeholder
          };
        });
        if (!list.length) {
          return;
        }
        nd = this$._quill.getContents();
        nd.ops.map(function(o){
          var r;
          if (r = hash[(o.insert || {}).image]) {
            return o.insert.image = r.placeholder;
          }
        });
        return debounce(0).then(function(){
          this$._quill.setContents(nd, 'silent');
          return this$.convertImages(list).then(function(list){
            return this$.uploadFiles(list, this$.insert.bind(this$));
          });
        });
      });
    }
  }, ref$);
  function import$(obj, src){
    var own = {}.hasOwnProperty;
    for (var key in src) if (own.call(src, key)) obj[key] = src[key];
    return obj;
  }
}).call(this);
