'use client';

import { useEffect, useRef, useState } from 'react';
import {
  getHours,
  getHoursMinutes,
  getHoursMinutesSeconds,
  getMinutes,
  getSeconds,
} from '@wojtekmaj/date-utils';

import Divider from './Divider.js';
import AmPm from './TimeInput/AmPm.js';
import Hour12Input from './TimeInput/Hour12Input.js';
import Hour24Input from './TimeInput/Hour24Input.js';
import MinuteInput from './TimeInput/MinuteInput.js';
import NativeInput from './TimeInput/NativeInput.js';
import SecondInput from './TimeInput/SecondInput.js';

import { getFormatter, getNumberFormatter } from './shared/dateFormatter.js';
import { convert12to24, convert24to12 } from './shared/dates.js';
import { getAmPmLabels } from './shared/utils.js';

import type { AmPmType, Detail, LooseValuePiece, Value } from './shared/types.js';

const getFormatterOptionsCache: Record<string, Intl.DateTimeFormatOptions> = {};

const allViews = ['hour', 'minute', 'second'] as const;
const acceptedFirstDigitsForHour: string[] = ['0', '1', '2'];

function isInternalInput(element: HTMLElement) {
  return element.dataset.input === 'true';
}

function findInput(
  element: HTMLElement,
  property: 'previousElementSibling' | 'nextElementSibling',
) {
  let nextElement: HTMLElement | null = element;
  do {
    nextElement = nextElement[property] as HTMLElement | null;
  } while (nextElement && !isInternalInput(nextElement));
  return nextElement;
}

function focus(element?: HTMLElement | null) {
  if (element) {
    element.focus();
  }
}

type RenderFunction = (match: string, index: number) => React.ReactNode;

function renderCustomInputs(
  placeholder: string,
  elementFunctions: Record<string, RenderFunction>,
  allowMultipleInstances: boolean,
) {
  const usedFunctions: RenderFunction[] = [];
  const pattern = new RegExp(
    Object.keys(elementFunctions)
      .map((el) => `${el}+`)
      .join('|'),
    'g',
  );
  const matches = placeholder.match(pattern);

  return placeholder.split(pattern).reduce<React.ReactNode[]>((arr, element, index) => {
    const divider = element && (
      // biome-ignore lint/suspicious/noArrayIndexKey: index is stable here
      <Divider key={`separator_${index}`}>{element}</Divider>
    );
    arr.push(divider);
    const currentMatch = matches?.[index];

    if (currentMatch) {
      const renderFunction =
        elementFunctions[currentMatch] ||
        elementFunctions[
          Object.keys(elementFunctions).find((elementFunction) =>
            currentMatch.match(elementFunction),
          ) as string
        ];

      if (!renderFunction) {
        return arr;
      }

      if (!allowMultipleInstances && usedFunctions.includes(renderFunction)) {
        arr.push(currentMatch);
      } else {
        arr.push(renderFunction(currentMatch, index));
        usedFunctions.push(renderFunction);
      }
    }

    return arr;
  }, []);
}

const formatNumber = getNumberFormatter({ useGrouping: false });

type TimeInputProps = {
  amPmAriaLabel?: string;
  autoFocus?: boolean;
  className: string;
  disabled?: boolean;
  format?: string;
  hourAriaLabel?: string;
  hourPlaceholder?: string;
  isClockOpen?: boolean | null;
  locale?: string;
  maxDetail?: Detail;
  maxTime?: string;
  minTime?: string;
  minuteAriaLabel?: string;
  minutePlaceholder?: string;
  name?: string;
  nativeInputAriaLabel?: string;
  onChange?: (value: Value, shouldCloseClock: boolean) => void;
  onInvalidChange?: () => void;
  required?: boolean;
  secondAriaLabel?: string;
  secondPlaceholder?: string;
  value?: LooseValuePiece;
};

export default function TimeInput({
  amPmAriaLabel,
  autoFocus,
  className,
  disabled,
  format,
  hourAriaLabel,
  hourPlaceholder,
  isClockOpen: isClockOpenProps = null,
  locale,
  maxDetail = 'minute',
  maxTime,
  minTime,
  minuteAriaLabel,
  minutePlaceholder,
  name = 'time',
  nativeInputAriaLabel,
  onChange: onChangeProps,
  onInvalidChange,
  required,
  secondAriaLabel,
  secondPlaceholder,
  value: valueProps,
}: TimeInputProps): React.ReactElement {
  const [amPm, setAmPm] = useState<AmPmType | null>(null);
  const twoDigitHour = useRef<string>('');
  const [hour, setHour] = useState<string | null>(null);
  const [minute, setMinute] = useState<string | null>(null);
  const [second, setSecond] = useState<string | null>(null);
  const [value, setValue] = useState<string | Date | null>(null);
  const amPmInput = useRef<HTMLSelectElement>(null);
  const hour12Input = useRef<HTMLInputElement>(null);
  const hour24Input = useRef<HTMLInputElement>(null);
  const minuteInput = useRef<HTMLInputElement>(null);
  const secondInput = useRef<HTMLInputElement>(null);
  const [isClockOpen, setIsClockOpen] = useState(isClockOpenProps);
  const lastPressedKey = useRef<KeyboardEvent['key'] | undefined>(undefined);

  useEffect(() => {
    setIsClockOpen(isClockOpenProps);
  }, [isClockOpenProps]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: useEffect intentionally triggered on props change
  useEffect(() => {
    const nextValue = valueProps;

    if (nextValue) {
      setAmPm(convert24to12(getHours(nextValue))[1]);
      setHour(getHours(nextValue).toString());
      setMinute(getMinutes(nextValue).toString());
      setSecond(getSeconds(nextValue).toString());
      setValue(nextValue);
    } else {
      setAmPm(null);
      setHour(null);
      setMinute(null);
      setSecond(null);
      setValue(null);
    }
  }, [
    valueProps,
    minTime,
    maxTime,
    maxDetail,
    // Toggling clock visibility resets values
    isClockOpen,
  ]);

  const valueType = maxDetail;

  const formatTime = (() => {
    const level = allViews.indexOf(maxDetail);
    const formatterOptions =
      getFormatterOptionsCache[level] ||
      (() => {
        const options: Intl.DateTimeFormatOptions = { hour: 'numeric' };
        if (level >= 1) {
          options.minute = 'numeric';
        }
        if (level >= 2) {
          options.second = 'numeric';
        }

        getFormatterOptionsCache[level] = options;

        return options;
      })();

    return getFormatter(formatterOptions);
  })();

  /**
   * Gets current value in a desired format.
   */
  function getProcessedValue(value: string) {
    const processFunction = (() => {
      switch (valueType) {
        case 'hour':
        case 'minute':
          return getHoursMinutes;
        case 'second':
          return getHoursMinutesSeconds;
        default:
          throw new Error('Invalid valueType');
      }
    })();

    return processFunction(value);
  }

  const placeholder =
    format ||
    (() => {
      const hour24 = 21;
      const hour12 = 9;
      const minute = 13;
      const second = 14;
      const date = new Date(2017, 0, 1, hour24, minute, second);

      return formatTime(locale, date)
        .replace(formatNumber(locale, hour12), 'h')
        .replace(formatNumber(locale, hour24), 'H')
        .replace(formatNumber(locale, minute), 'mm')
        .replace(formatNumber(locale, second), 'ss')
        .replace(new RegExp(getAmPmLabels(locale).join('|')), 'a');
    })();

  const divider = (() => {
    const dividers = placeholder.match(/[^0-9a-z]/i);
    return dividers ? dividers[0] : null;
  })();

  function onClick(event: React.MouseEvent<HTMLDivElement> & { target: HTMLDivElement }) {
    if (event.target === event.currentTarget) {
      // Wrapper was directly clicked
      const firstInput = event.target.children[1] as HTMLInputElement;
      focus(firstInput);
    }
  }

  function onKeyDown(
    event:
      | (React.KeyboardEvent<HTMLInputElement> & { target: HTMLInputElement })
      | (React.KeyboardEvent<HTMLSelectElement> & { target: HTMLSelectElement }),
  ) {
    lastPressedKey.current = event.key;
    if (['hour12', 'hour24'].includes(event.target.name)) {
      const isNumber = !Number.isNaN(Number(event.key));
      if (isNumber) {
        if (twoDigitHour.current.length || acceptedFirstDigitsForHour.includes(event.key)) {
          if (twoDigitHour.current.length < 2) {
            if (twoDigitHour.current !== '2' || Number(event.key) < 4) {
              twoDigitHour.current += event.key;
            }
          } else if (event.target.name === 'hour12') {
            setAmPm((amPm) => amPm || convert24to12(twoDigitHour.current)[1]);
          }
        }
      } else if (event.key === 'Backspace') {
        twoDigitHour.current = twoDigitHour.current.slice(0, -1);
      }
    }

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowRight':
      case divider: {
        event.preventDefault();

        const { target: input } = event;
        const property =
          event.key === 'ArrowLeft' ? 'previousElementSibling' : 'nextElementSibling';
        const nextInput = findInput(input, property);
        focus(nextInput);
        break;
      }
      default:
    }
  }

  function onKeyUp(event: React.KeyboardEvent<HTMLInputElement> & { target: HTMLInputElement }) {
    const { key, target: input } = event;

    const isLastPressedKey = lastPressedKey.current === key;

    if (!isLastPressedKey) {
      return;
    }

    const isNumberKey = !Number.isNaN(Number(key));

    if (!isNumberKey) {
      return;
    }

    const max = input.getAttribute('max');

    if (!max) {
      return;
    }

    const { name, value } = input;

    /**
     * Given 1, the smallest possible number the user could type by adding another digit is 10.
     * 10 would be a valid value given max = 12, so we won't jump to the next input.
     * However, given 2, smallers possible number would be 20, and thus keeping the focus in
     * this field doesn't make sense.
     */
    const isHourInput = ['hour12', 'hour24'].includes(name);
    if (
      isHourInput
        ? !twoDigitHour.current ||
          twoDigitHour.current.length === 2 ||
          Number(twoDigitHour.current) > Number(max) ||
          twoDigitHour.current.length >= max.length
        : Number(value) * 10 > Number(max) || value.length >= max.length
    ) {
      const property = 'nextElementSibling';
      const nextInput = findInput(input, property);
      focus(nextInput);
    }
  }

  /**
   * Called after internal onChange. Checks input validity. If all fields are valid,
   * calls props.onChange.
   */
  function onChangeExternal(amPmOverride?: AmPmType, hourOverride?: string) {
    if (!onChangeProps) {
      return;
    }

    type NonFalsy<T> = T extends false | 0 | '' | null | undefined | 0n ? never : T;

    function filterBoolean<T>(value: T): value is NonFalsy<typeof value> {
      return Boolean(value);
    }

    const formElements = [
      ...(amPmOverride ? [] : [amPmInput.current]),
      ...(hourOverride ? [] : [hour12Input.current]),
      hour24Input.current,
      minuteInput.current,
      secondInput.current,
    ].filter(filterBoolean);

    const formElementsWithoutSelect = formElements.slice(amPmOverride ? 0 : 1);

    const values: Record<string, string | number> & {
      amPm?: AmPmType;
    } = {};
    for (const formElement of formElements) {
      values[formElement.name] =
        formElement.type === 'number' ? formElement.valueAsNumber : formElement.value;
    }

    const isEveryValueEmpty = formElementsWithoutSelect.every((formElement) => !formElement.value);

    if (isEveryValueEmpty) {
      onChangeProps(null, false);
      return;
    }
    const amPmValue =
      amPmOverride || (!values.amPm && Number(twoDigitHour.current) > 12 ? 'pm' : values.amPm);
    const isEveryValueFilled = formElements.every((formElement) => formElement.value);
    const isEveryValueValid = formElements.every((formElement) => formElement.validity.valid);

    if (isEveryValueFilled && isEveryValueValid) {
      const hour =
        hourOverride ||
        Number(
          values.hour24 ||
            (values.hour12 && amPmValue && convert12to24(values.hour12, amPmValue)) ||
            0,
        );
      const minute = Number(values.minute || 0);
      const second = Number(values.second || 0);

      const padStart = (num: string | number) => `0${num}`.slice(-2);

      const proposedValue = `${padStart(hour)}:${padStart(minute)}:${padStart(second)}`;

      const processedValue = getProcessedValue(proposedValue);

      // Avoids extra renders if value is being updated to the current value
      if (processedValue === valueProps) return;

      onChangeProps(processedValue, false);
      return;
    }

    if (!onInvalidChange) {
      return;
    }

    onInvalidChange();
  }

  /**
   * Called when non-native date input is changed.
   */
  function onChange(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = event.target;

    switch (name) {
      case 'amPm':
        setAmPm(value as AmPmType);
        break;
      case 'hour12': {
        if (Number(value) > 23) break;
        const newHour = value
          ? acceptedFirstDigitsForHour.includes(twoDigitHour.current)
            ? value
            : convert12to24(value, amPm || (value === '12' ? 'pm' : 'am')).toString()
          : '';
        setHour(newHour);
        break;
      }
      case 'hour24':
        if (Number(value) > 23) break;
        setHour(value);
        break;
      case 'minute':
        setMinute(value);
        break;
      case 'second':
        setSecond(value);
        break;
    }

    onChangeExternal();
  }

  /**
   * Called when native date input is changed.
   */
  function onChangeNative(event: React.ChangeEvent<HTMLInputElement>) {
    const { value } = event.target;

    if (!onChangeProps) {
      return;
    }

    const processedValue = value || null;

    onChangeProps(processedValue, false);
  }

  const commonInputProps = {
    className,
    disabled,
    maxTime,
    minTime,
    onChange,
    onKeyDown,
    onKeyUp,
    // This is only for showing validity when editing
    required: Boolean(required || isClockOpen),
  };

  const handleBlurHourInput = (event: React.FocusEvent<HTMLInputElement>) => {
    let newAmPm: AmPmType | undefined;
    let newHour: string | undefined;
    if (event.target.name === 'hour12') {
      if (hour === '0') {
        setHour('12');
        if (!amPm || amPm === 'am') {
          setAmPm('am');
          newAmPm = 'am';
          newHour = '00';
        } else {
          newHour = '12';
        }
      } else if (hour) {
        newAmPm = amPm || convert24to12(hour)[1];
        setAmPm(newAmPm);
      }
    }
    if (twoDigitHour.current || amPm !== newAmPm) {
      // We pass overrides, b/c they are not reflected in the state by the
      // time onChangeExternal is called
      onChangeExternal(newAmPm, newHour);
      twoDigitHour.current = '';
    }
  };

  const handleClickInput = (event: React.MouseEvent<HTMLInputElement>) => {
    // Requires all text to be selected, because if the user clicks within the
    // hour input and removes just one of the digits, then the twoDigitHour
    // will be out-of-sync. We also apply this to the other inputs for consistent UX.

    // Select all text in the input when clicked
    const input = event.target as HTMLInputElement;
    input.select();

    // Prevent placing the cursor inside the input
    event.preventDefault();
  };

  function renderHour12(currentMatch: string, index: number) {
    if (currentMatch && currentMatch.length > 2) {
      throw new Error(`Unsupported token: ${currentMatch}`);
    }

    const showLeadingZeros = currentMatch ? currentMatch.length === 2 : false;

    return (
      <Hour12Input
        key="hour12"
        {...commonInputProps}
        amPm={amPm}
        ariaLabel={hourAriaLabel}
        autoFocus={index === 0 && autoFocus}
        inputRef={hour12Input}
        placeholder={hourPlaceholder}
        showLeadingZeros={showLeadingZeros}
        isFirstDigitZero={twoDigitHour.current === '0'}
        value={hour}
        onBlur={handleBlurHourInput}
        onClick={handleClickInput}
      />
    );
  }

  function renderHour24(currentMatch: string, index: number) {
    if (currentMatch && currentMatch.length > 2) {
      throw new Error(`Unsupported token: ${currentMatch}`);
    }

    const showLeadingZeros = currentMatch ? currentMatch.length === 2 : false;

    return (
      <Hour24Input
        key="hour24"
        {...commonInputProps}
        ariaLabel={hourAriaLabel}
        autoFocus={index === 0 && autoFocus}
        inputRef={hour24Input}
        placeholder={hourPlaceholder}
        showLeadingZeros={showLeadingZeros}
        value={hour}
        onBlur={handleBlurHourInput}
        onClick={handleClickInput}
      />
    );
  }

  function renderHour(currentMatch: string, index: number) {
    if (/h/.test(currentMatch)) {
      return renderHour12(currentMatch, index);
    }

    return renderHour24(currentMatch, index);
  }

  function renderMinute(currentMatch: string, index: number) {
    if (currentMatch && currentMatch.length > 2) {
      throw new Error(`Unsupported token: ${currentMatch}`);
    }

    const showLeadingZeros = currentMatch ? currentMatch.length === 2 : false;

    return (
      <MinuteInput
        key="minute"
        {...commonInputProps}
        ariaLabel={minuteAriaLabel}
        autoFocus={index === 0 && autoFocus}
        hour={hour}
        inputRef={minuteInput}
        placeholder={minutePlaceholder}
        showLeadingZeros={showLeadingZeros}
        value={minute}
        onClick={handleClickInput}
      />
    );
  }

  function renderSecond(currentMatch: string, index: number) {
    if (currentMatch && currentMatch.length > 2) {
      throw new Error(`Unsupported token: ${currentMatch}`);
    }

    const showLeadingZeros = currentMatch ? currentMatch.length === 2 : true;

    return (
      <SecondInput
        key="second"
        {...commonInputProps}
        ariaLabel={secondAriaLabel}
        autoFocus={index === 0 && autoFocus}
        hour={hour}
        inputRef={secondInput}
        minute={minute}
        placeholder={secondPlaceholder}
        showLeadingZeros={showLeadingZeros}
        value={second}
        onClick={handleClickInput}
      />
    );
  }

  function renderAmPm(_currentMatch: string, index: number) {
    return (
      <AmPm
        key="ampm"
        {...commonInputProps}
        ariaLabel={amPmAriaLabel}
        autoFocus={index === 0 && autoFocus}
        inputRef={amPmInput}
        locale={locale}
        onChange={onChange}
        value={amPm}
      />
    );
  }

  function renderCustomInputsInternal() {
    const elementFunctions = {
      h: renderHour,
      H: renderHour,
      m: renderMinute,
      s: renderSecond,
      a: renderAmPm,
    };

    const allowMultipleInstances = typeof format !== 'undefined';
    return renderCustomInputs(placeholder, elementFunctions, allowMultipleInstances);
  }

  function renderNativeInput() {
    return (
      <NativeInput
        key="time"
        ariaLabel={nativeInputAriaLabel}
        disabled={disabled}
        maxTime={maxTime}
        minTime={minTime}
        name={name}
        onChange={onChangeNative}
        required={required}
        value={value}
        valueType={valueType}
      />
    );
  }

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: This interaction is designed for mouse users only
    // biome-ignore lint/a11y/noStaticElementInteractions: This interaction is designed for mouse users only
    <div className={className} onClick={onClick}>
      {renderNativeInput()}
      {renderCustomInputsInternal()}
    </div>
  );
}
