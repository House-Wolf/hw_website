import { ComponentType, MessageFlags } from "discord.js";

/** Keep banner media and announcement text in one responsive, full-width card. */
export function bannerMessage({ image, body, content, ...message }) {
  const text = (value) => ({ type: ComponentType.TextDisplay, content: value });
  return {
    ...message,
    flags: MessageFlags.IsComponentsV2,
    components: [
      ...(content ? [text(content)] : []),
      {
        type: ComponentType.Container,
        accent_color: body.color,
        components: [
          { type: ComponentType.MediaGallery, items: [{ media: { url: image.url }, description: body.title }] },
          text([body.author && `**${body.author.name}**`, body.title && `### ${body.title}`, body.description].filter(Boolean).join("\n\n")),
          ...(body.fields ?? []).map((field) => text(
            field.name === "\u200b" ? field.value : `**${field.name}**\n${field.value}`,
          )),
          ...(body.footer ? [text(`-# ${body.footer.text}`)] : []),
        ],
      },
    ],
  };
}
