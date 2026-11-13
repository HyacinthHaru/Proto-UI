# S4 React import completion observations

A detached d854cae checkout with the named diagnostic patch ran the complete bilingual S4 test using the original assertions and 150-second case deadlines. Both cases timed out. The React renderer module pair returned, then loadReact entered with an empty Base Accordion host at 27.683s zh-cn and 23.168s en on their respective page clocks.

The probe attached resolve and reject observers to the existing react, react-dom and react-dom/client promises before the original Promise.all wait. No completion event from any of the three was streamed in either case. No React root render request was observed. This narrows the next observation to browser network completion, module evaluation and delivery of the import callbacks. It does not establish a specific package failure. Each original case still records 18 separately owned Shadow errors.

[Demo Matrix tracking](https://github.com/Proto-UI/Proto-UI/issues/1178)
