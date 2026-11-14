import React from 'react';
import { createPortal } from 'react-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function CustomDatePicker({
  value,
  onChange,
  placeholder = 'Select date...',
  isDark = true,
  disabled = false,
  required = false,
  minDate = null,
  maxDate = null,
  className = '',
  dateFormat = 'yyyy-MM-dd',
  displayFormat = 'D MMM YYYY',
  iconPosition = 'right',
  inputClassName = '',
  popperPlacement = 'bottom-start',
  portalId = 'datepicker-portal',
}) {
  // Convert string (YYYY-MM-DD) or other inputs into Date object
  const parseDate = (val) => {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    try {
      const parts = String(val).split('T')[0].split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        return new Date(year, month, day);
      }
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  };

  const selectedDate = parseDate(value);

  const handleDateChange = (date) => {
    if (!date) {
      onChange?.('', null);
      return;
    }
    // Format to YYYY-MM-DD using local time
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    onChange?.(dateStr, date);
  };

  const pad = (n) => String(n).padStart(2, '0');
  const getFormattedDisplay = () => {
    if (!selectedDate) return '';
    if (displayFormat === 'DD-MM-YYYY') {
      return `${pad(selectedDate.getDate())}-${pad(selectedDate.getMonth() + 1)}-${selectedDate.getFullYear()}`;
    }
    if (displayFormat === 'MM-DD-YYYY') {
      return `${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}-${selectedDate.getFullYear()}`;
    }
    if (displayFormat === 'YYYY-MM-DD') {
      return `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}`;
    }
    // Default format: "7 Nov 2026"
    const day = selectedDate.getDate();
    const month = selectedDate.toLocaleString('en-US', { month: 'short' });
    const year = selectedDate.getFullYear();
    return `${day} ${month} ${year}`;
  };

  return (
    <div className={`relative w-full ${className}`}>
      <DatePicker
        selected={selectedDate}
        onChange={handleDateChange}
        dateFormat={dateFormat}
        placeholderText={placeholder}
        disabled={disabled}
        required={required}
        minDate={parseDate(minDate)}
        maxDate={parseDate(maxDate)}
        portalId={portalId}
        popperPlacement={popperPlacement}
        popperProps={{ strategy: 'fixed' }}
        popperClassName="custom-datepicker-popper"
        calendarClassName={`custom-datepicker-calendar ${isDark ? 'calendar-dark' : 'calendar-light'}`}
        showPopperArrow={false}
        renderCustomHeader={({
          date,
          decreaseMonth,
          increaseMonth,
          prevMonthButtonDisabled,
          nextMonthButtonDisabled,
        }) => (
          <div className={`flex items-center justify-between px-3 py-2.5 border-b select-none ${
            isDark ? 'border-slate-800 text-slate-100' : 'border-slate-200 text-slate-800'
          }`}>
            <button
              type="button"
              onClick={decreaseMonth}
              disabled={prevMonthButtonDisabled}
              aria-label="Previous Month"
              className={`w-7 h-7 rounded-xl flex items-center justify-center transition cursor-pointer ${
                isDark
                  ? 'hover:bg-slate-800 text-slate-400 hover:text-cyan-400 disabled:opacity-20'
                  : 'hover:bg-slate-100 text-slate-500 hover:text-indigo-600 disabled:opacity-20'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-mono text-xs font-bold tracking-wider capitalize">
              {date.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
            </span>

            <button
              type="button"
              onClick={increaseMonth}
              disabled={nextMonthButtonDisabled}
              aria-label="Next Month"
              className={`w-7 h-7 rounded-xl flex items-center justify-center transition cursor-pointer ${
                isDark
                  ? 'hover:bg-slate-800 text-slate-400 hover:text-cyan-400 disabled:opacity-20'
                  : 'hover:bg-slate-100 text-slate-500 hover:text-indigo-600 disabled:opacity-20'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
        customInput={
          <div className="relative w-full cursor-pointer">
            <input
              type="text"
              readOnly
              value={getFormattedDisplay()}
              placeholder={placeholder}
              className={`w-full h-[38px] ${
                iconPosition === 'right' ? 'pl-3.5 pr-10' : 'pl-10 pr-9'
              } rounded-lg text-xs font-mono border outline-none transition cursor-pointer select-none ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-500 hover:border-slate-600 focus:border-cyan-500'
                  : 'bg-white border-gray-300 text-gray-800 placeholder:text-gray-400 hover:border-gray-400 focus:border-blue-500'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${inputClassName}`}
            />
            <Calendar
              className={`w-4 h-4 absolute ${
                iconPosition === 'right' ? 'right-3.5' : 'left-3.5'
              } top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none`}
            />
            {selectedDate && !disabled && !required && iconPosition !== 'right' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDateChange(null);
                }}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full transition ${
                  isDark ? 'text-slate-500 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        }
      />
    </div>
  );
}

