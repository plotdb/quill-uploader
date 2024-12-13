quill-uploader = (o={}) ->
  @_quill = o.editor
  @_sig = {}
  @_evthdr = {}
  @_upload = o.upload 
  @_progress = o.progress or (->)
  @handler =
    upload: @_handler.upload.bind @
    change: @_handler.change.bind @
  @

quill-uploader.prototype = Object.create(Object.prototype) <<<
  on: (n, cb) -> (if Array.isArray(n) => n else [n]).map (n) ~> @_evthdr.[][n].push cb
  fire: (n, ...v) -> for cb in (@_evthdr[n] or []) => cb.apply @, v
  editor: -> if arguments.length => @_quill = it else @_quill
  need-upload: (url = "") -> !!(/data:image/.exec(url) and !@_sig[@sig url])
  sig: (url) -> (url or '').substring(0,64)
  key: -> "#{Math.random!toString(36)substring(2)}-#{Date.now!}"
  insert: (o) ->
    nd = @_quill.getContents!
    ret = nd.ops
      .filter (op) ~>
        return if o.sig == @sig((op.insert or {}).image) =>
          op.insert.image = o.file.url
          true
        else if "\##{o.sig}" == @sig((op.attributes or {}).link) =>
          op.attributes.link = o.file.url
          op.insert = o.file.url
          true
        else false
    if ret.length => @_quill.setContents nd
  # omit heading `<svg` so we can append attrs easily.
  _ld: '''xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" width="96" height="96" style="background:#fafafa"><g><circle stroke-dasharray="131.95 45.98" r="28" stroke-width="8" stroke="#d7d7d7" fill="none" cy="50" cx="50"><animateTransform keyTimes="0;1" values="0 50 50;360 50 50" dur="1s" repeatCount="indefinite" type="rotate" attributeName="transform"></animateTransform></circle></g></svg>'''

  #files contains object {file, ...} where
  #  - `blob`: the file blob
  #  - `...`: additional info which will be passed to `insert`.
  # `insert` accpets an object with `file`(from server) and `blob` (file object)
  upload-files: (files = [], insert) -> @_upload-files files, insert, 0
  _upload-files: (files, insert, idx, ext = {}) ->
    file = files[idx]
    if !file => return Promise.resolve!
    Promise.resolve!
      .then ~> @_upload {file: file.blob, progress: @_progress}
      .then (f) ->
        f = [{} <<< f <<< {blob: file.blob}]
        (if ext.detail => ext.detail(f) else Promise.resolve f)
      .then (f) ~>
        f = f.0
        delete f.blob
        @fire \uploaded, f
        if insert => insert(file <<< {file: f})
        @_upload-files files, insert, idx + 1, ext

  convert-images: (list) ->
    ps = list.map (o) ->
      (r) <- ldfile.fromURL o.image, \blob .then _
      {blob: r.file, sig: o.sig}
    Promise.all ps

  _handler:
    # this is used with {handlers:{image:obj.handler.upload}} when initing quill
    # it's for dynamics when user clicks the image button
    upload: (opt = {}) -> ~>
      input = document.createElement \input
      input.setAttribute \type, \file
      if opt.type == \image => input.setAttribute \accept, 'image/png, image/gif, image/jpeg'
      input.onchange = ~>
        ext = {}
        files = input.files
        if !(files and files.length) => return
        files = [files.0]
        input.value = null
        key = @key!
        if opt.type == \image =>
          placeholder = "data:image/svg+xml;base64," + btoa("""<svg data-key="#key" #{@_ld}""")
          sig = @sig(placeholder)
          @_sig[sig] = true
          @_quill.insertEmbed @_quill.getSelection!index, \image, placeholder
        else
          sig = @sig(key)
          @_sig[sig] = true
          @_quill.insertText @_quill.getSelection!index, sig, {link: "##sig"}
        @upload-files(files.map((blob)->{blob, sig}), @insert.bind(@))
      input.click!
    # this is used by called in quill's text-change handler
    # it convert all base64 images to an URL returned by host uploader
    change: (delta, old-detail, src) ->
      <~ Promise.resolve!then _
      hash = {}
      list = delta.ops
        .filter (o) ~> @need-upload (o.insert or {}).image
        .map (o) ~>
          key = @key!
          image = o.insert.image
          placeholder = "data:image/svg+xml;base64," + btoa("""<svg data-key="#key" #{@_ld}""")
          sig = @sig(placeholder)
          @_sig[sig] = true
          hash[image] = {sig, image, placeholder}
      if !list.length => return
      nd = @_quill.getContents!
      nd.ops.map (o) -> if (r = hash[(o.insert or {}).image]) => o.insert.image = r.placeholder
      <~ debounce 0 .then _
      @_quill.setContents nd, \silent
      (list) <~ @convert-images list .then _
      @upload-files list, @insert.bind(@)
