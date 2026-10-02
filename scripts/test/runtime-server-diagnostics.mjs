/** Report a shared server failure without interrupting the browser test output. */
export function observeRuntimeServer(server, { isShuttingDown, readOutput, report }) {
  let reported = false;
  const unexpected = (detail) => {
    if (reported || isShuttingDown()) return;
    reported = true;
    report(
      `[test:runtime] shared documentation server failed after readiness: ${detail}\n` +
        `Recent server output (at most 20,000 characters):\n${readOutput().slice(-20_000)}`
    );
  };
  const onError = (error) =>
    unexpected(
      `exitCode=${server.exitCode ?? null}; signal=${server.signalCode ?? null}; error=${error.message}`
    );
  const onExit = (code, signal) => unexpected(`exitCode=${code}; signal=${signal}`);
  server.on('error', onError);
  server.once('exit', onExit);
  return () => {
    server.off('error', onError);
    server.off('exit', onExit);
  };
}
