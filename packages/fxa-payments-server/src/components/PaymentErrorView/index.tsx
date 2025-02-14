import React, { useContext } from 'react';
import { useHistory } from 'react-router-dom';
import { Localized } from '@fluent/react';
import { StripeError } from '@stripe/stripe-js';

import { getErrorMessage, GeneralError } from '../../lib/errors';
import errorIcon from '../../images/error.svg';
import SubscriptionTitle from '../SubscriptionTitle';
import TermsAndPrivacy from '../TermsAndPrivacy';

import './index.scss';
import { Plan } from '../../store/types';
import PaymentLegalBlurb from '../PaymentLegalBlurb';
import AppContext from '../../lib/AppContext';

export type PaymentErrorViewProps = {
  onRetry: Function;
  plan: Plan;
  error?: StripeError | GeneralError;
  className?: string;
  subscriptionTitle?: React.ReactElement<SubscriptionTitle>;
  isPasswordlessCheckout?: boolean;
};

const retryButtonFn = (onRetry: PaymentErrorViewProps['onRetry']) => (
  <Localized id="payment-error-retry-button">
    <button
      data-testid="retry-link"
      className="button retry-link primary-button"
      onClick={() => onRetry()}
    >
      Try again
    </button>
  </Localized>
);

const manageSubButtonFn = (onClick: VoidFunction) => {
  return (
    <Localized id="payment-error-manage-subscription-button">
      <button
        data-testid="manage-subscription-link"
        className="button primary-button"
        onClick={onClick}
      >
        Manage my subscription
      </button>
    </Localized>
  );
};

export const PaymentErrorView = ({
  onRetry,
  plan,
  error,
  className = '',
  subscriptionTitle,
  isPasswordlessCheckout = false,
}: PaymentErrorViewProps) => {
  const history = useHistory();
  const { config } = useContext(AppContext);

  // We want the button label and onClick handler to be different depending
  // on the type of error
  const ActionButton = () => {
    switch (error?.code) {
      case 'no_subscription_change':
        return manageSubButtonFn(() => history.push('/subscriptions'));
      default:
        return retryButtonFn(onRetry);
    }
  };

  const title = subscriptionTitle ?? (
    <SubscriptionTitle screenType="error" className={className} />
  );

  const productName = plan.product_name;

  return error ? (
    <>
      {title}
      <section
        className={`container card payment-error ${className}`}
        data-testid="payment-error"
      >
        <div className="wrapper">
          <img id="error-icon" src={errorIcon} alt="error icon" />
          <div>
            <Localized id={getErrorMessage(error)} vars={{ productName }}>
              <p data-testid="error-payment-submission">
                {getErrorMessage(error)}
              </p>
            </Localized>
          </div>
        </div>

        <div className="footer" data-testid="footer">
          {/* This error code means the subscription was created successfully, but
          there was an error loading the information on the success screen. In this
          case, we do not want a "Try again" or "Manage subscription" button. */}
          {error.code !== 'fxa_fetch_profile_customer_error' ? (
            <ActionButton data-testid={'error-view-action-button'} />
          ) : null}
          <PaymentLegalBlurb provider={undefined} />
          <TermsAndPrivacy
            showFXALinks={isPasswordlessCheckout}
            plan={plan}
            contentServerURL={config.servers.content.url}
          />
        </div>
      </section>
    </>
  ) : null;
};

export default PaymentErrorView;
