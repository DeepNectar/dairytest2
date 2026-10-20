(function () {
  var BASE = 'https://unvomzolyjwcdavitdmr.supabase.co';
  window.fetch = function (url, opts) {
    if (typeof url === 'string' && url.indexOf(BASE + '/rest/v1/') === 0) {
      var nu = 'http://127.0.0.1:8765' + url.slice(BASE.length);
      // Browser CORS preflight blocks DELETE with apikey headers -> tunnel as POST
      if (opts && opts.method === 'DELETE') {
        return fetch(nu, { method: 'POST', headers: { 'X-Method-Override': 'DELETE' } })
          .then(function (r) { return r.text(); })
          .then(function () { return new Response('', { status: 204 }); });
      }
      return fetch(nu, opts);
    }
    return fetch.apply(window, arguments);
  };
})();
