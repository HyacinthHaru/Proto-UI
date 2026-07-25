import { defineReactComponent } from '@proto.ui/adapters-react';
import { defineVueComponent } from '@proto.ui/adapters-vue';
import { defineWebComponent } from '@proto.ui/adapters-web-component';
import {
  BrutalistCardAction,
  BrutalistCardContent,
  BrutalistCardDescription,
  BrutalistCardFooter,
  BrutalistCardHeader,
  BrutalistCardRoot,
  BrutalistCardTitle,
} from '@proto.ui/prototypes-brutalist';

const tags = {
  root: 'pui-brutalist-card-root',
  header: 'pui-brutalist-card-header',
  title: 'pui-brutalist-card-title',
  description: 'pui-brutalist-card-description',
  action: 'pui-brutalist-card-action',
  content: 'pui-brutalist-card-content',
  footer: 'pui-brutalist-card-footer',
} as const;
const prototypes = {
  root: BrutalistCardRoot,
  header: BrutalistCardHeader,
  title: BrutalistCardTitle,
  description: BrutalistCardDescription,
  action: BrutalistCardAction,
  content: BrutalistCardContent,
  footer: BrutalistCardFooter,
} as const;
for (const key of Object.keys(tags) as Array<keyof typeof tags>) {
  defineWebComponent(tags[key], defineReactComponent(prototypes[key], () => null).def);
}

export default {
  label: 'Brutalist Card',
  setup: () => ({
    html: [
      `<${tags.root} style="max-width:32rem">`,
      `<${tags.header}><div><${tags.title}>AI Support</${tags.title}><${tags.description}>Conversation workspace</${tags.description}></div><${tags.action}>LIVE</${tags.action}></${tags.header}>`,
      `<${tags.content}><p style="margin:0;font-family:monospace">Use Card as an explicit panel shell; message state belongs to Message.</p></${tags.content}>`,
      `<${tags.footer}><span>12 messages</span><strong>READY</strong></${tags.footer}>`,
      `</${tags.root}>`,
    ].join(''),
  }),
  react: { component: defineReactComponent(BrutalistCardRoot, () => null) },
  vue: { component: defineVueComponent(BrutalistCardRoot) },
};
