// Intercept pm2 axm messages to avoid vitest-pool IPC conflicts
const origSend = process.send;
if (origSend) {
  process.send = function (message: any, ...args: any[]) {
    if (message && typeof message === 'object' && typeof message.type === 'string' && message.type.startsWith('axm:')) {
      return true as any;
    }
    return (origSend as any).call(process, message, ...args);
  };
}
