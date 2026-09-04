import { css } from 'lit';

export const sharedStyles = css`
  :host {
    --app-background-color: #191919;
    --app-accent-color: #2196f3;

    /* Dark theme default */
    --card-bg-color: #212121;
    --card-image-bg-color: #1e1e1e;
    --card-title-color: #f4f4f4;
    --card-description-color: #aaaaaa;
    --card-date-color: #606060;

    --header-color: white;
    --page-title-color: white;
    --module-title-color: #eeeeee;
    --bottom-nav-bg-color: #212121;
    --bottom-nav-item-color: #999999;

    --chip-background-color: rgba(255, 255, 255, 0.05);
    --chip-color: rgba(255, 255, 255, 0.8);

    --toast-bg-color: #323232;
    --toast-color: #f4f4f4;

    --shadow-elevation-2dp: 0 3px 6px 0 rgba(0, 0, 0, 0.07),
                            0 1px 14px 0 rgba(0, 0, 0, 0.06),
                            0 6px 10px -2px rgba(0, 0, 0, 0.05);

    --shadow-elevation-4dp: 0 3px 12px 0 rgba(0, 0, 0, 0.15),
                            0 1px 24px 0 rgba(0, 0, 0, 0.15),
                            0 6px 24px -2px rgba(0, 0, 0, 0.15);

    --shadow-elevation-8dp: 0 8px 10px 1px rgba(0, 0, 0, 0.14),
                            0 3px 14px 2px rgba(0, 0, 0, 0.12),
                            0 5px 5px -3px rgba(0, 0, 0, 0.4);
    box-sizing: border-box;
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  /* Accessible focus ring */
  :focus-visible {
    outline: 2px solid var(--app-accent-color);
    outline-offset: 2px;
  }

  .link {
    color: inherit;
    text-decoration: none;
  }

  h1 {
    margin: 0;
    color: var(--page-title-color);
    font-size: 32px;
    line-height: 34px;
    font-weight: 300;
  }

  h2 {
    margin: 0;
    color: var(--module-title-color);
    font-weight: 300;
    font-size: 20px;
  }

  p {
    margin: 0;
    font-size: 16px;
    line-height: 24px;
    color: var(--card-description-color);
    font-weight: 400;
  }

  /* Flex utilities */
  .layout-horizontal {
    display: flex;
    flex-direction: row;
  }

  .layout-vertical {
    display: flex;
    flex-direction: column;
  }

  .layout-center {
    align-items: center;
  }

  .layout-center-center {
    align-items: center;
    justify-content: center;
  }

  .layout-justified {
    justify-content: space-between;
  }

  .layout-wrap {
    flex-wrap: wrap;
  }

  .flex {
    flex: 1;
  }

  .button {
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.018em;
    line-height: 24px;
    text-transform: uppercase;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 6px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    background-color: transparent;
    color: var(--app-accent-color);
    transition: background-color 0.2s ease, box-shadow 0.2s ease;
    font-family: inherit;
  }

  .button.raised {
    background-color: var(--app-accent-color);
    color: white;
    box-shadow: var(--shadow-elevation-2dp);
  }

  .button.raised:hover {
    box-shadow: var(--shadow-elevation-4dp);
  }

  .button:disabled {
    background-color: #444;
    color: #888;
    cursor: not-allowed;
    box-shadow: none;
  }

  /* Skeleton Shimmer System */
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  .skeleton {
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.04) 25%,
      rgba(255, 255, 255, 0.1) 37%,
      rgba(255, 255, 255, 0.04) 63%
    );
    background-size: 400% 100%;
    animation: shimmer 1.8s ease infinite;
    border-radius: 4px;
  }

  @media (max-width: 600px) {
    h1 {
      font-size: 24px;
      line-height: 26px;
    }
    h2 {
      font-size: 16px;
    }
  }
`;
