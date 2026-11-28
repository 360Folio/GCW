import Markdown, { type Components } from "react-markdown";

// Story text comes from the database as Markdown. Raw HTML is dropped and
// links to other sites open without passing on who sent the reader.
const components: Components = {
  h1: ({ children }) => <h2>{children}</h2>,
  a: ({ href, children }) => {
    const external = /^https?:\/\//i.test(href ?? "");
    return (
      <a href={href} {...(external ? { rel: "nofollow noopener noreferrer", target: "_blank" } : {})}>
        {children}
      </a>
    );
  },
};

export function StoryMarkdown({ children }: { children: string }) {
  return (
    <Markdown components={components} skipHtml>
      {children}
    </Markdown>
  );
}
