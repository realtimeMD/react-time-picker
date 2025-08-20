import { userEvent } from '@vitest/browser/context';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';

import TimeInput from './TimeInput.js';

import { muteConsole, restoreConsole } from '../../../test-utils.js';

// biome-ignore lint/correctness/useHookAtTopLevel: False positive, see https://github.com/biomejs/biome/issues/6396
vi.useFakeTimers({ toFake: ['Date'] });

const hasFullICU = (() => {
  try {
    const date = new Date(2018, 0, 1, 21);
    const formatter = new Intl.DateTimeFormat('de-DE', { hour: 'numeric' });
    return formatter.format(date).includes('21');
  } catch {
    return false;
  }
})();

const itIfFullICU = it.skipIf(!hasFullICU);

describe('TimeInput', () => {
  const defaultProps = {
    className: 'react-time-picker__inputGroup',
  };

  it('renders a native input and custom inputs', () => {
    const { container } = render(<TimeInput {...defaultProps} />);

    const nativeInput = container.querySelector('input[type="time"]');
    const customInputs = container.querySelectorAll('input[data-input]');

    expect(nativeInput).toBeInTheDocument();
    expect(customInputs).toHaveLength(2);
  });

  it('does not render second input when maxDetail is "minute" or less', () => {
    const { container } = render(<TimeInput {...defaultProps} maxDetail="minute" />);

    const customInputs = container.querySelectorAll('input[data-input]');
    const secondInput = container.querySelector('input[name="second"]');
    const minuteInput = container.querySelector('input[name="minute"]');
    const hourInput = container.querySelector('input[name^="hour"]');

    expect(customInputs).toHaveLength(2);
    expect(secondInput).toBeFalsy();
    expect(minuteInput).toBeInTheDocument();
    expect(hourInput).toBeInTheDocument();
  });

  it('does not render second and minute inputs when maxDetail is "hour" or less', () => {
    const { container } = render(<TimeInput {...defaultProps} maxDetail="hour" />);

    const customInputs = container.querySelectorAll('input[data-input]');
    const secondInput = container.querySelector('input[name="second"]');
    const minuteInput = container.querySelector('input[name="minute"]');
    const hourInput = container.querySelector('input[name^="hour"]');

    expect(customInputs).toHaveLength(1);
    expect(secondInput).toBeFalsy();
    expect(minuteInput).toBeFalsy();
    expect(hourInput).toBeInTheDocument();
  });

  it('shows a given time in all inputs correctly (12-hour format)', () => {
    const date = '22:17:03';

    const { container } = render(<TimeInput {...defaultProps} maxDetail="second" value={date} />);

    const nativeInput = container.querySelector('input[type="time"]');
    const customInputs = container.querySelectorAll('input[data-input]');

    expect(nativeInput).toHaveValue(date);
    expect(customInputs[0]).toHaveValue(10);
    expect(customInputs[1]).toHaveValue(17);
    expect(customInputs[2]).toHaveValue(3);
  });

  itIfFullICU('shows a given time in all inputs correctly (24-hour format)', () => {
    const date = '22:17:03';

    const { container } = render(
      <TimeInput {...defaultProps} locale="de-DE" maxDetail="second" value={date} />,
    );

    const nativeInput = container.querySelector('input[type="time"]');
    const customInputs = container.querySelectorAll('input[data-input]');

    expect(nativeInput).toHaveValue(date);
    expect(customInputs[0]).toHaveValue(22);
    expect(customInputs[1]).toHaveValue(17);
    expect(customInputs[2]).toHaveValue(3);
  });

  it('shows empty value in all inputs correctly given null', () => {
    const { container } = render(<TimeInput {...defaultProps} maxDetail="second" value={null} />);

    const nativeInput = container.querySelector('input[type="time"]');
    const customInputs = container.querySelectorAll('input[data-input]');

    expect(nativeInput).toHaveAttribute('value', '');
    expect(customInputs[0]).toHaveAttribute('value', '');
    expect(customInputs[1]).toHaveAttribute('value', '');
    expect(customInputs[2]).toHaveAttribute('value', '');
  });

  it('clears the value correctly', () => {
    const date = '22:17:03';

    const { container, rerender } = render(
      <TimeInput {...defaultProps} maxDetail="second" value={date} />,
    );

    rerender(<TimeInput {...defaultProps} maxDetail="second" value={null} />);

    const nativeInput = container.querySelector('input[type="time"]');
    const customInputs = container.querySelectorAll('input[data-input]');

    expect(nativeInput).toHaveAttribute('value', '');
    expect(customInputs[0]).toHaveAttribute('value', '');
    expect(customInputs[1]).toHaveAttribute('value', '');
    expect(customInputs[2]).toHaveAttribute('value', '');
  });

  it('renders custom inputs in a proper order (12-hour format)', () => {
    const { container } = render(<TimeInput {...defaultProps} maxDetail="second" />);

    const customInputs = container.querySelectorAll('input[data-input]');

    expect(customInputs[0]).toHaveAttribute('name', 'hour12');
    expect(customInputs[1]).toHaveAttribute('name', 'minute');
    expect(customInputs[2]).toHaveAttribute('name', 'second');
  });

  itIfFullICU('renders custom inputs in a proper order (24-hour format)', () => {
    const { container } = render(<TimeInput {...defaultProps} locale="de-DE" maxDetail="second" />);

    const customInputs = container.querySelectorAll('input[data-input]');

    expect(customInputs[0]).toHaveAttribute('name', 'hour24');
    expect(customInputs[1]).toHaveAttribute('name', 'minute');
    expect(customInputs[2]).toHaveAttribute('name', 'second');
  });

  it.todo('renders hour input without leading zero by default');

  it.todo('renders minute input with leading zero by default');

  it.todo('renders second input with leading zero by default');

  describe('renders custom input in a proper order given format', () => {
    it('renders "h" properly', () => {
      const { container } = render(<TimeInput {...defaultProps} format="h" />);

      const componentInput = container.querySelector('input[name="hour12"]');
      const customInputs = container.querySelectorAll('input[data-input]');

      expect(componentInput).toBeInTheDocument();
      expect(customInputs).toHaveLength(1);
    });

    it('renders "hh" properly', () => {
      const { container } = render(<TimeInput {...defaultProps} format="hh" />);

      const componentInput = container.querySelector('input[name="hour12"]');
      const customInputs = container.querySelectorAll('input[data-input]');

      expect(componentInput).toBeInTheDocument();
      expect(customInputs).toHaveLength(1);
    });

    it('throws error for "hhh"', () => {
      muteConsole();

      const renderComponent = () => render(<TimeInput {...defaultProps} format="hhh" />);

      expect(renderComponent).toThrow('Unsupported token: hhh');

      restoreConsole();
    });

    it('renders "H" properly', () => {
      const { container } = render(<TimeInput {...defaultProps} format="H" />);

      const componentInput = container.querySelector('input[name="hour24"]');
      const customInputs = container.querySelectorAll('input[data-input]');

      expect(componentInput).toBeInTheDocument();
      expect(customInputs).toHaveLength(1);
    });

    it('renders "HH" properly', () => {
      const { container } = render(<TimeInput {...defaultProps} format="HH" />);

      const componentInput = container.querySelector('input[name="hour24"]');
      const customInputs = container.querySelectorAll('input[data-input]');

      expect(componentInput).toBeInTheDocument();
      expect(customInputs).toHaveLength(1);
    });

    it('throws error for "HHH"', () => {
      muteConsole();

      const renderComponent = () => render(<TimeInput {...defaultProps} format="HHH" />);

      expect(renderComponent).toThrow('Unsupported token: HHH');

      restoreConsole();
    });

    it('renders "m" properly', () => {
      const { container } = render(<TimeInput {...defaultProps} format="m" />);

      const componentInput = container.querySelector('input[name="minute"]');
      const customInputs = container.querySelectorAll('input[data-input]');

      expect(componentInput).toBeInTheDocument();
      expect(customInputs).toHaveLength(1);
    });

    it('renders "mm" properly', () => {
      const { container } = render(<TimeInput {...defaultProps} format="mm" />);

      const componentInput = container.querySelector('input[name="minute"]');
      const customInputs = container.querySelectorAll('input[data-input]');

      expect(componentInput).toBeInTheDocument();
      expect(customInputs).toHaveLength(1);
    });

    it('throws error for "mmm"', () => {
      muteConsole();

      const renderComponent = () => render(<TimeInput {...defaultProps} format="mmm" />);

      expect(renderComponent).toThrow('Unsupported token: mmm');

      restoreConsole();
    });

    it('renders "s" properly', () => {
      const { container } = render(<TimeInput {...defaultProps} format="s" />);

      const componentInput = container.querySelector('input[name="second"]');
      const customInputs = container.querySelectorAll('input[data-input]');

      expect(componentInput).toBeInTheDocument();
      expect(customInputs).toHaveLength(1);
    });

    it('renders "ss" properly', () => {
      const { container } = render(<TimeInput {...defaultProps} format="ss" />);

      const componentInput = container.querySelector('input[name="second"]');
      const customInputs = container.querySelectorAll('input[data-input]');

      expect(componentInput).toBeInTheDocument();
      expect(customInputs).toHaveLength(1);
    });

    it('throws error for "sss"', () => {
      muteConsole();

      const renderComponent = () => render(<TimeInput {...defaultProps} format="sss" />);

      expect(renderComponent).toThrow('Unsupported token: sss');

      restoreConsole();
    });

    it('renders "a" properly', () => {
      const { container } = render(<TimeInput {...defaultProps} format="a" />);

      const componentSelect = container.querySelector('select[name="amPm"]');
      const customInputs = container.querySelectorAll('input[data-input]');

      expect(componentSelect).toBeInTheDocument();
      expect(customInputs).toHaveLength(0);
    });
  });

  it('renders proper input separators', () => {
    const { container } = render(<TimeInput {...defaultProps} maxDetail="second" />);

    const separators = container.querySelectorAll('.react-time-picker__inputGroup__divider');

    expect(separators).toHaveLength(3);
    expect(separators[0]).toHaveTextContent(':');
    expect(separators[1]).toHaveTextContent(':');
    expect(separators[2]).toHaveTextContent(''); // Non-breaking space
  });

  it('renders proper amount of separators', () => {
    const { container } = render(<TimeInput {...defaultProps} />);

    const separators = container.querySelectorAll('.react-time-picker__inputGroup__divider');
    const customInputs = container.querySelectorAll('input[data-input]');
    const ampm = container.querySelectorAll('select');

    expect(separators).toHaveLength(customInputs.length + ampm.length - 1);
  });

  it('jumps to the next field when right arrow is pressed', async () => {
    const { container } = render(<TimeInput {...defaultProps} maxDetail="second" />);

    const customInputs = container.querySelectorAll('input[data-input]');
    const hourInput = customInputs[0] as HTMLInputElement;
    const minuteInput = customInputs[1];

    await userEvent.type(hourInput, '{arrowright}');

    expect(minuteInput).toHaveFocus();
  });

  it('jumps to the next field when separator key is pressed', async () => {
    const { container } = render(<TimeInput {...defaultProps} maxDetail="second" />);

    const customInputs = container.querySelectorAll('input[data-input]');
    const hourInput = customInputs[0] as HTMLInputElement;
    const minuteInput = customInputs[1];

    const separator = container.querySelector(
      '.react-time-picker__inputGroup__divider',
    ) as HTMLSpanElement;
    const separatorKey = separator.textContent as string;

    await userEvent.type(hourInput, separatorKey);

    expect(minuteInput).toHaveFocus();
  });

  it('does not jump to the next field when right arrow is pressed when the last input is focused', async () => {
    const { container } = render(<TimeInput {...defaultProps} maxDetail="second" />);

    const select = container.querySelector('select') as HTMLSelectElement;

    await userEvent.type(select, '{arrowright}');

    expect(select).toHaveFocus();
  });

  it('jumps to the previous field when left arrow is pressed', async () => {
    const { container } = render(<TimeInput {...defaultProps} maxDetail="second" />);

    const customInputs = container.querySelectorAll('input[data-input]');
    const hourInput = customInputs[0];
    const minuteInput = customInputs[1] as HTMLInputElement;

    await userEvent.type(minuteInput, '{arrowleft}');

    expect(hourInput).toHaveFocus();
  });

  it('does not jump to the previous field when left arrow is pressed when the first input is focused', async () => {
    const { container } = render(<TimeInput {...defaultProps} maxDetail="second" />);

    const customInputs = container.querySelectorAll('input[data-input]');
    const hourInput = customInputs[0] as HTMLInputElement;

    await userEvent.type(hourInput, '{arrowleft}');

    expect(hourInput).toHaveFocus();
  });

  it("jumps to the next field when a value which can't be extended to another valid value is entered", async () => {
    const { container } = render(<TimeInput {...defaultProps} />);

    const customInputs = container.querySelectorAll('input[data-input]');
    const hourInput = customInputs[0] as HTMLInputElement;
    const minuteInput = customInputs[1];

    await userEvent.type(hourInput, '4');

    expect(minuteInput).toHaveFocus();
  });

  it('jumps to the next field when a value as long as the length of maximum value is entered', async () => {
    const { container } = render(<TimeInput {...defaultProps} />);

    const customInputs = container.querySelectorAll('input[data-input]');
    const hourInput = customInputs[0] as HTMLInputElement;
    const minuteInput = customInputs[1];

    await userEvent.type(hourInput, '03');

    expect(minuteInput).toHaveFocus();
  });

  it("jumps to the next field when a value which can't be extended to another valid value is entered by typing with multiple keys", async () => {
    function getActiveElement() {
      return document.activeElement as HTMLInputElement;
    }

    function keyDown(key: string, initial = false) {
      const element = getActiveElement();
      fireEvent.keyDown(element, { key });
      fireEvent.keyPress(element, { key });
      element.value = (initial ? '' : element.value) + key;
    }

    function keyUp(key: string) {
      fireEvent.keyUp(getActiveElement(), { key });
    }

    const date = '22:17:03';

    const { container } = render(<TimeInput {...defaultProps} value={date} />);

    const customInputs = container.querySelectorAll('input[data-input]');
    const hourInput = customInputs[0] as HTMLInputElement;
    const minuteInput = customInputs[1];

    hourInput.focus();
    expect(hourInput).toHaveFocus();

    keyDown('1', true);
    keyDown('2');

    keyUp('1');
    expect(hourInput).toHaveFocus();

    keyUp('2');
    expect(minuteInput).toHaveFocus();
  });

  describe('does not jump the next field when', async () => {
    describe('a value which can be extended to another valid value is entered', () => {
      it('hour starts with a "0"', async () => {
        const { container } = render(<TimeInput {...defaultProps} />);
        const customInputs = container.querySelectorAll('input[data-input]');
        const hourInput = customInputs[0] as HTMLInputElement;
        await userEvent.type(hourInput, '0');
        expect(hourInput).toHaveFocus();
      });

      it('hour starts with a "1"', async () => {
        const { container } = render(<TimeInput {...defaultProps} />);
        const customInputs = container.querySelectorAll('input[data-input]');
        const hourInput = customInputs[0] as HTMLInputElement;
        await userEvent.type(hourInput, '1');
        expect(hourInput).toHaveFocus();
      });

      it('hour starts with a "2"', async () => {
        const { container } = render(<TimeInput {...defaultProps} />);
        const customInputs = container.querySelectorAll('input[data-input]');
        const hourInput = customInputs[0] as HTMLInputElement;
        await userEvent.type(hourInput, '2');
        expect(hourInput).toHaveFocus();
      });
    });

    it('the second digit entered for the hour would make it larger than 23', async () => {
      const { container } = render(<TimeInput {...defaultProps} />);
      const customInputs = container.querySelectorAll('input[data-input]');
      const hourInput = customInputs[0] as HTMLInputElement;
      await userEvent.type(hourInput, '24');
      expect(hourInput).toHaveFocus();
    });
  });

  it('triggers onChange correctly when changed custom input', () => {
    const onChange = vi.fn();
    const date = '22:17:03';

    const { container } = render(
      <TimeInput {...defaultProps} maxDetail="second" onChange={onChange} value={date} />,
    );

    const customInputs = container.querySelectorAll('input[data-input]');
    const hourInput = customInputs[0] as HTMLInputElement;

    fireEvent.change(hourInput, { target: { value: '8' } });

    expect(onChange).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith('20:17:03', false);
  });

  it('triggers onChange correctly when cleared custom inputs', () => {
    const onChange = vi.fn();
    const date = '22:17:03';

    const { container } = render(
      <TimeInput {...defaultProps} maxDetail="second" onChange={onChange} value={date} />,
    );

    const customInputs = Array.from(container.querySelectorAll('input[data-input]'));

    for (const customInput of customInputs) {
      fireEvent.change(customInput, { target: { value: '' } });
    }

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(null, false);
  });

  it('triggers onChange correctly when there is a value for the minute input, but not the amPm, and the hour is set', async () => {
    const onChange = vi.fn();
    const { container } = render(
      <TimeInput {...defaultProps} maxDetail="minute" onChange={onChange} value={null} />,
    );

    const customInputs = container.querySelectorAll('input[data-input]');
    const hourInput = customInputs[0] as HTMLInputElement;
    const minuteInput = customInputs[1] as HTMLInputElement;

    fireEvent.change(minuteInput, { target: { value: '30' } });
    userEvent.type(hourInput, '8');

    await waitFor(() => expect(minuteInput).toHaveFocus());

    expect(onChange).toHaveBeenCalledWith('08:30', false);
  });

  it('triggers onChange correctly when changed native input', () => {
    const onChange = vi.fn();
    const date = '22:17:03';

    const { container } = render(
      <TimeInput {...defaultProps} maxDetail="second" onChange={onChange} value={date} />,
    );

    const nativeInput = container.querySelector('input[type="time"]') as HTMLInputElement;

    fireEvent.change(nativeInput, { target: { value: '20:17:03' } });

    expect(onChange).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith('20:17:03', false);
  });

  it('triggers onChange correctly when cleared native input', () => {
    const onChange = vi.fn();
    const date = '22:17:03';

    const { container } = render(
      <TimeInput {...defaultProps} maxDetail="second" onChange={onChange} value={date} />,
    );

    const nativeInput = container.querySelector('input[type="time"]') as HTMLInputElement;

    fireEvent.change(nativeInput, { target: { value: '' } });

    expect(onChange).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith(null, false);
  });

  it.each`
    twoDigitHour | hour12 | amPm    | expectedTime
    ${'00'}      | ${12}  | ${'am'} | ${'00:30'}
    ${'01'}      | ${1}   | ${'am'} | ${'01:30'}
    ${'02'}      | ${2}   | ${'am'} | ${'02:30'}
    ${'03'}      | ${3}   | ${'am'} | ${'03:30'}
    ${'04'}      | ${4}   | ${'am'} | ${'04:30'}
    ${'05'}      | ${5}   | ${'am'} | ${'05:30'}
    ${'06'}      | ${6}   | ${'am'} | ${'06:30'}
    ${'07'}      | ${7}   | ${'am'} | ${'07:30'}
    ${'08'}      | ${8}   | ${'am'} | ${'08:30'}
    ${'09'}      | ${9}   | ${'am'} | ${'09:30'}
    ${'10'}      | ${10}  | ${'am'} | ${'10:30'}
    ${'11'}      | ${11}  | ${'am'} | ${'11:30'}
    ${'12'}      | ${12}  | ${'pm'} | ${'12:30'}
    ${'13'}      | ${1}   | ${'pm'} | ${'13:30'}
    ${'14'}      | ${2}   | ${'pm'} | ${'14:30'}
    ${'15'}      | ${3}   | ${'pm'} | ${'15:30'}
    ${'16'}      | ${4}   | ${'pm'} | ${'16:30'}
    ${'17'}      | ${5}   | ${'pm'} | ${'17:30'}
    ${'18'}      | ${6}   | ${'pm'} | ${'18:30'}
    ${'19'}      | ${7}   | ${'pm'} | ${'19:30'}
    ${'20'}      | ${8}   | ${'pm'} | ${'20:30'}
    ${'21'}      | ${9}   | ${'pm'} | ${'21:30'}
    ${'22'}      | ${10}  | ${'pm'} | ${'22:30'}
    ${'23'}      | ${11}  | ${'pm'} | ${'23:30'}
  `(
    'converts two digit hour "$twoDigitHour" to $hour12 $amPm',
    async ({ twoDigitHour, hour12, amPm, expectedTime }) => {
      const onChange = vi.fn();
      const { container } = render(
        <TimeInput {...defaultProps} maxDetail="minute" onChange={onChange} />,
      );

      const customInputs = container.querySelectorAll('input[data-input]');
      const hourInput = customInputs[0] as HTMLInputElement;
      const minuteInput = customInputs[1] as HTMLInputElement;
      const amPmSelect = container.querySelector('select[name="amPm"]') as HTMLSelectElement;

      await userEvent.clear(hourInput);
      await userEvent.type(hourInput, twoDigitHour);
      await userEvent.type(minuteInput, '30');

      expect(hourInput).toHaveValue(hour12);
      expect(amPmSelect.value).toBe(amPm);

      expect(onChange).toHaveBeenCalledWith(expectedTime, false);
    },
  );

  it('automatically sets the amPm for single digit numbers when one has not been set', async () => {
    const { container } = render(<TimeInput {...defaultProps} />);

    const customInputs = container.querySelectorAll('input[data-input]');
    const hourInput = customInputs[0] as HTMLInputElement;
    const amPmSelect = container.querySelector('select[name="amPm"]') as HTMLSelectElement;

    await userEvent.clear(hourInput);
    await userEvent.type(hourInput, '3');

    expect(hourInput).toHaveValue(3);
    expect(amPmSelect.value).toBe('am');
  });

  it('does not allow entering two digit dates larger than 23 (12-hr format)', async () => {
    const { container } = render(<TimeInput {...defaultProps} maxDetail="second" />);

    const customInputs = container.querySelectorAll('input[data-input]');
    const hourInput = customInputs[0] as HTMLInputElement;

    await userEvent.type(hourInput, '24');

    expect(hourInput).toHaveValue(2);
  });

  it('does not allow entering two digit dates larger than 23 (24-hr format)', async () => {
    const { container } = render(<TimeInput {...defaultProps} maxDetail="second" locale="de-DE" />);

    const customInputs = container.querySelectorAll('input[data-input]');
    const hourInput = customInputs[0] as HTMLInputElement;

    await userEvent.type(hourInput, '24');

    expect(hourInput).toHaveValue(2);
  });

  it('allows using backspace to delete characters when entering a two-digit hour', async () => {
    const { container } = render(<TimeInput {...defaultProps} maxDetail="second" />);

    const customInputs = container.querySelectorAll('input[data-input]');
    const hourInput = customInputs[0] as HTMLInputElement;

    await userEvent.type(hourInput, '1');
    expect(hourInput).toHaveValue(1);

    await userEvent.type(hourInput, '{backspace}14');
    expect(hourInput).toHaveValue(2);
  });

  it.each`
    twoDigitHour | hour12 | amPm    | expectedTime
    ${'00'}      | ${12}  | ${'am'} | ${'12:17'}
    ${'01'}      | ${1}   | ${'am'} | ${'13:17'}
    ${'02'}      | ${2}   | ${'am'} | ${'14:17'}
    ${'03'}      | ${3}   | ${'am'} | ${'15:17'}
    ${'04'}      | ${4}   | ${'am'} | ${'16:17'}
    ${'05'}      | ${5}   | ${'am'} | ${'17:17'}
    ${'06'}      | ${6}   | ${'am'} | ${'18:17'}
    ${'07'}      | ${7}   | ${'am'} | ${'19:17'}
    ${'08'}      | ${8}   | ${'am'} | ${'20:17'}
    ${'09'}      | ${9}   | ${'am'} | ${'21:17'}
    ${'10'}      | ${10}  | ${'am'} | ${'22:17'}
    ${'11'}      | ${11}  | ${'am'} | ${'23:17'}
    ${'12'}      | ${12}  | ${'pm'} | ${'00:17'}
    ${'13'}      | ${1}   | ${'pm'} | ${'01:17'}
    ${'14'}      | ${2}   | ${'pm'} | ${'02:17'}
    ${'15'}      | ${3}   | ${'pm'} | ${'03:17'}
    ${'16'}      | ${4}   | ${'pm'} | ${'04:17'}
    ${'17'}      | ${5}   | ${'pm'} | ${'05:17'}
    ${'18'}      | ${6}   | ${'pm'} | ${'06:17'}
    ${'19'}      | ${7}   | ${'pm'} | ${'07:17'}
    ${'20'}      | ${8}   | ${'pm'} | ${'08:17'}
    ${'21'}      | ${9}   | ${'pm'} | ${'09:17'}
    ${'22'}      | ${10}  | ${'pm'} | ${'10:17'}
    ${'23'}      | ${11}  | ${'pm'} | ${'11:17'}
  `(
    'does not update the amPm value when $twoDigitHour is entered if it is already set',
    async ({ twoDigitHour, hour12, amPm, expectedTime }) => {
      const onChange = vi.fn();
      const { container } = render(
        <TimeInput {...defaultProps} maxDetail="minute" onChange={onChange} />,
      );

      const customInputs = container.querySelectorAll('input[data-input]');
      const hourInput = customInputs[0] as HTMLInputElement;
      const minuteInput = customInputs[1] as HTMLInputElement;
      const amPmSelect = container.querySelector('select[name="amPm"]') as HTMLSelectElement;

      // Set amPm to the opposite value first
      const oppositeAmPmFromTwoDigitHour = amPm === 'am' ? 'pm' : 'am';
      fireEvent.change(amPmSelect, { target: { value: oppositeAmPmFromTwoDigitHour } });

      await userEvent.type(minuteInput, '17');
      await userEvent.type(hourInput, twoDigitHour);

      expect(hourInput).toHaveValue(hour12);
      // Assert that amPm did not change from the initial value
      expect(amPmSelect.value).toBe(oppositeAmPmFromTwoDigitHour);

      expect(onChange).toHaveBeenCalledWith(expectedTime, false);
    },
  );
});
