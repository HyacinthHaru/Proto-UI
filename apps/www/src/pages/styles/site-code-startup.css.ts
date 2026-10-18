import { codeStartupPaintCss } from '../../components/site-startup-paint';

export async function GET() {
  return new Response(await codeStartupPaintCss(), {
    headers: { 'Content-Type': 'text/css; charset=utf-8' },
  });
}
