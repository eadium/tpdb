async function HelloWorld(ctx, next) {
    await next();
    const rt = ctx.response.get('X-Response-Time');
    console.log(`${ctx.method} ${ctx.url} - ${rt}`);
  };

  // x-response-time

async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    ctx.set('X-Response-Time', `${ms}ms`);
  };

  // response

async ctx => {
    ctx.body = 'Hello World';
  };