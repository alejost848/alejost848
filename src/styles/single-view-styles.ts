import { css } from 'lit';

export const singleViewStyles = css`
  :host {
    display: block;
    position: relative;
    width: 100%;
  }


  #card {
    position: relative;
    background-color: var(--card-bg-color);
    border-radius: 4px;
    overflow: hidden;
    box-shadow: var(--shadow-elevation-2dp);
  }

  #placeholder_card {
    position: relative;
    width: 100%;
    padding-top: 56.25%; /* 16:9 Aspect Ratio */
    background-color: var(--card-image-bg-color);
  }

  #placeholder_card img,
  #placeholder_card iframe,
  #placeholder_card lite-youtube {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: none;
    object-fit: cover;
  }


  #title_header {
    position: relative;
    display: flex;
    align-items: center;
    min-height: 72px;
    margin-bottom: 23px;
  }

  h1 {
    color: white;
    font-size: 32px;
    font-weight: 300;
  }

  #episode_number {
    color: rgba(255, 255, 255, 0.5);
    font-weight: 400;
    margin-right: 12px;
  }

  #card_content {
    padding: 40px 30px;
    position: relative;
  }

  #publishedDate {
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 12px;
    color: var(--card-date-color);
  }

  #description {
    color: var(--card-description-color);
    white-space: pre-wrap;
    font-size: 15px;
    line-height: 24px;
  }

  .share_wrapper {
    position: absolute;
    right: 24px;
    top: 0;
    transform: translateY(-50%);
    --fab-color: var(--progress-color, var(--app-accent-color));
  }

  @media (max-width: 600px) {
    :host {
      padding: 0 0 60px 0 !important;
    }
    #card_content {
      padding: 20px;
    }
    #publishedDate {
      font-size: 13px;
    }
    #description {
      font-size: 13px;
      line-height: 18px;
    }
    #title_header {
      padding: 0 10px;
      margin-bottom: 0;
    }
    h1 {
      font-size: 20px;
    }
    #episode_number {
      font-size: 14px;
    }
  }
`;
