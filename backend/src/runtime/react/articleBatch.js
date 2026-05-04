const React = require("react");
const {
  BenefitsList,
  CtaLink,
  EyebrowHeadline,
  MultilineCopy,
  PresellImage,
  renderStaticReactTemplate
} = require("./shared");

function AdvertorialTemplate({ viewModel }) {
  const { bullets, presell, templateData } = viewModel;

  return React.createElement(
    "main",
    { className: "article-shell" },
    React.createElement(
      "article",
      { className: "article" },
      React.createElement(EyebrowHeadline, {
        eyebrow: templateData.eyebrowText,
        headline: presell.headline,
        headlineClass: templateData.headlineClass,
        subtitle: presell.subtitle,
        subtitleClass: templateData.subtitleClass
      }),
      React.createElement(PresellImage, {
        className: "hero-img",
        imageUrl: templateData.imageUrl
      }),
      React.createElement(MultilineCopy, {
        className: "copy",
        text: presell.body
      }),
      React.createElement(BenefitsList, {
        className: "benefits",
        items: bullets
      }),
      React.createElement(CtaLink, {
        className: "cta",
        href: templateData.ctaHref,
        text: templateData.ctaText
      }),
      templateData.disclaimerText
        ? React.createElement("p", { className: "disclaimer" }, templateData.disclaimerText)
        : null
    )
  );
}

function ReviewTemplate({ viewModel }) {
  const { bullets, presell, templateData } = viewModel;

  return React.createElement(
    "main",
    { className: "review-shell" },
    React.createElement(
      "section",
      { className: "review-hero" },
      React.createElement(
        "div",
        null,
        React.createElement(EyebrowHeadline, {
          eyebrow: templateData.eyebrowText,
          headline: presell.headline,
          headlineClass: templateData.headlineClass,
          subtitle: presell.subtitle,
          subtitleClass: templateData.subtitleClass
        })
      ),
      React.createElement(PresellImage, {
        className: "hero-img",
        imageUrl: templateData.imageUrl
      })
    ),
    React.createElement(
      "section",
      { className: "article" },
      React.createElement(MultilineCopy, {
        className: "copy",
        text: presell.body
      }),
      React.createElement(
        "div",
        { className: "review-box" },
        React.createElement("h2", null, "Resumo"),
        React.createElement(BenefitsList, {
          className: "benefits",
          items: bullets
        })
      ),
      React.createElement(CtaLink, {
        className: "cta",
        href: templateData.ctaHref,
        text: templateData.ctaText
      }),
      templateData.disclaimerText
        ? React.createElement("p", { className: "disclaimer" }, templateData.disclaimerText)
        : null
    )
  );
}

function ProblemTemplate({ viewModel }) {
  const { bullets, presell, templateData } = viewModel;

  return React.createElement(
    "main",
    { className: "split-shell" },
    React.createElement(
      "section",
      { className: "problem-panel" },
      React.createElement(EyebrowHeadline, {
        eyebrow: templateData.eyebrowText,
        headline: presell.headline,
        headlineClass: templateData.headlineClass,
        subtitle: presell.subtitle,
        subtitleClass: templateData.subtitleClass
      }),
      React.createElement(MultilineCopy, {
        className: "copy",
        text: presell.body
      }),
      React.createElement(BenefitsList, {
        className: "benefits",
        items: bullets
      }),
      React.createElement(CtaLink, {
        className: "cta",
        href: templateData.ctaHref,
        text: templateData.ctaText
      })
    ),
    React.createElement(PresellImage, {
      className: "side-img",
      imageUrl: templateData.imageUrl
    })
  );
}

function QuizTemplate({ viewModel }) {
  const { presell, templateData } = viewModel;

  return React.createElement(
    "main",
    { className: "quiz-shell" },
    React.createElement(
      "section",
      { className: "quiz-card" },
      React.createElement(EyebrowHeadline, {
        eyebrow: templateData.eyebrowText,
        headline: presell.headline,
        headlineClass: templateData.headlineClass,
        subtitle: presell.subtitle,
        subtitleClass: templateData.subtitleClass
      }),
      React.createElement(PresellImage, {
        className: "hero-img",
        imageUrl: templateData.imageUrl
      }),
      React.createElement(MultilineCopy, {
        className: "copy",
        text: presell.body
      }),
      React.createElement(
        "div",
        { className: "quiz-options" },
        templateData.quizOptions.map((item, index) => React.createElement(
          "a",
          {
            href: templateData.ctaHref,
            key: `${item}-${index}`
          },
          item
        ))
      ),
      React.createElement(CtaLink, {
        className: "cta secondary",
        href: templateData.ctaHref,
        text: templateData.ctaText
      })
    )
  );
}

function createArticleBatchRenderer(templateId, Component) {
  function renderArticleBatchTemplate(viewModel) {
    return renderStaticReactTemplate(viewModel, {
      bodyClassName: "public-body",
      Component
    });
  }

  return Object.freeze({
    templateId,
    entry: `runtime/react/${templateId}`,
    render: renderArticleBatchTemplate
  });
}

const advertorialReactRenderer = createArticleBatchRenderer("advertorial", AdvertorialTemplate);
const reviewReactRenderer = createArticleBatchRenderer("review", ReviewTemplate);
const problemReactRenderer = createArticleBatchRenderer("problem", ProblemTemplate);
const quizReactRenderer = createArticleBatchRenderer("quiz", QuizTemplate);

const articleBatchReactRenderers = Object.freeze([
  advertorialReactRenderer,
  reviewReactRenderer,
  problemReactRenderer,
  quizReactRenderer
]);

module.exports = {
  AdvertorialTemplate,
  ReviewTemplate,
  ProblemTemplate,
  QuizTemplate,
  advertorialReactRenderer,
  reviewReactRenderer,
  problemReactRenderer,
  quizReactRenderer,
  articleBatchReactRenderers
};
