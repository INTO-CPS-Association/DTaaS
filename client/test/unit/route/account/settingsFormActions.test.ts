import {
  validateSettingsForm,
  dispatchChangedSettings,
  FormValues,
} from 'route/account/settingsFormActions';
import {
  setGroupName,
  setDTDirectory,
  setCommonLibraryProjectName,
  setRunnerTag,
  setBranchName,
  setTrials,
  setSecondaryRunnerTag,
  setPrimaryDTName,
  setSecondaryDTName,
  setLoggingEnabled,
} from 'store/settings.slice';

const validFormValues = (): FormValues => ({
  groupName: 'group',
  dtDirectory: 'digital_twins',
  commonLibraryProjectName: 'common',
  runnerTag: 'runner',
  branchName: 'main',
  measurementTrials: '5',
  measurementSecondaryRunnerTag: 'secondary-runner',
  measurementPrimaryDTName: 'primary',
  measurementSecondaryDTName: 'secondary',
  loggingEnabled: true,
});
const validCurrent = () => ({
  GROUP_NAME: 'group',
  DT_DIRECTORY: 'digital_twins',
  COMMON_LIBRARY_PROJECT_NAME: 'common',
  RUNNER_TAG: 'runner',
  BRANCH_NAME: 'main',
  MEASUREMENT_TRIALS: 5,
  MEASUREMENT_SECONDARY_RUNNER_TAG: 'secondary-runner',
  MEASUREMENT_PRIMARY_DT_NAME: 'primary',
  MEASUREMENT_SECONDARY_DT_NAME: 'secondary',
  LOGGING_ENABLED: true,
});

describe('validateSettingsForm', () => {
  it('returns no errors when every field is valid', () => {
    expect(validateSettingsForm(validFormValues())).toEqual({});
  });

  type RequiredStringField = Exclude<
    keyof FormValues,
    'measurementTrials' | 'loggingEnabled'
  >;

  const requiredStringFields: RequiredStringField[] = [
    'groupName',
    'dtDirectory',
    'commonLibraryProjectName',
    'runnerTag',
    'branchName',
    'measurementSecondaryRunnerTag',
    'measurementPrimaryDTName',
    'measurementSecondaryDTName',
  ];

  it.each(requiredStringFields)('flags %s when empty', (field) => {
    const errors = validateSettingsForm({ ...validFormValues(), [field]: '' });
    expect(errors).toEqual({ [field]: true });
  });

  it.each(requiredStringFields)('flags %s when only whitespace', (field) => {
    const errors = validateSettingsForm({
      ...validFormValues(),
      [field]: '   ',
    });
    expect(errors).toEqual({ [field]: true });
  });

  it('flags every required field when all are blank', () => {
    const allBlank = validFormValues();
    requiredStringFields.forEach((field) => {
      allBlank[field] = '';
    });
    const errors = validateSettingsForm(allBlank);
    requiredStringFields.forEach((field) => {
      expect(errors[field]).toBe(true);
    });
  });

  it.each(['', '   '])(
    'flags measurementTrials when blank (%j)',
    (measurementTrials) => {
      const errors = validateSettingsForm({
        ...validFormValues(),
        measurementTrials,
      });
      expect(errors.measurementTrials).toBe(true);
    },
  );

  it('flags measurementTrials when not a number', () => {
    const errors = validateSettingsForm({
      ...validFormValues(),
      measurementTrials: 'abc',
    });
    expect(errors.measurementTrials).toBe(true);
  });

  it.each(['0', '-1'])(
    'flags measurementTrials when less than 1 (%j)',
    (measurementTrials) => {
      const errors = validateSettingsForm({
        ...validFormValues(),
        measurementTrials,
      });
      expect(errors.measurementTrials).toBe(true);
    },
  );

  it('accepts measurementTrials of 1', () => {
    const errors = validateSettingsForm({
      ...validFormValues(),
      measurementTrials: '1',
    });
    expect(errors.measurementTrials).toBeUndefined();
  });
});

describe('dispatchChangedSettings', () => {
  const runDispatch = (formValues: FormValues) => {
    const dispatch = jest.fn();
    const needsRefresh = dispatchChangedSettings(
      dispatch,
      formValues,
      validCurrent(),
    );
    return { dispatch, needsRefresh };
  };

  it('dispatches nothing and returns false when no field changed', () => {
    const { dispatch, needsRefresh } = runDispatch(validFormValues());
    expect(dispatch).not.toHaveBeenCalled();
    expect(needsRefresh).toBe(false);
  });

  const stringFieldCases: Array<{
    field: keyof FormValues;
    changedValue: string;
    action: (value: string) => unknown;
  }> = [
    { field: 'groupName', changedValue: 'new-group', action: setGroupName },
    {
      field: 'dtDirectory',
      changedValue: 'new-directory',
      action: setDTDirectory,
    },
    {
      field: 'commonLibraryProjectName',
      changedValue: 'new-library',
      action: setCommonLibraryProjectName,
    },
    { field: 'runnerTag', changedValue: 'new-runner', action: setRunnerTag },
    { field: 'branchName', changedValue: 'new-branch', action: setBranchName },
    {
      field: 'measurementSecondaryRunnerTag',
      changedValue: 'new-secondary-runner',
      action: setSecondaryRunnerTag,
    },
    {
      field: 'measurementPrimaryDTName',
      changedValue: 'new-primary',
      action: setPrimaryDTName,
    },
    {
      field: 'measurementSecondaryDTName',
      changedValue: 'new-secondary',
      action: setSecondaryDTName,
    },
  ];

  it.each(stringFieldCases)(
    'dispatches only the $field setter when $field changes',
    ({ field, changedValue, action }) => {
      const { dispatch } = runDispatch({
        ...validFormValues(),
        [field]: changedValue,
      });
      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch).toHaveBeenCalledWith(action(changedValue));
    },
  );

  it('dispatches setTrials with the parsed integer when measurementTrials changes', () => {
    const { dispatch } = runDispatch({
      ...validFormValues(),
      measurementTrials: '10',
    });
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(setTrials(10));
  });

  it('dispatches setLoggingEnabled when loggingEnabled changes', () => {
    const { dispatch, needsRefresh } = runDispatch({
      ...validFormValues(),
      loggingEnabled: false,
    });
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(setLoggingEnabled(false));
    expect(needsRefresh).toBe(false);
  });

  it('does not dispatch setTrials for invalid measurementTrials', () => {
    ['', '   ', 'abc', '0', '-1'].forEach((measurementTrials) => {
      const { dispatch } = runDispatch({
        ...validFormValues(),
        measurementTrials,
      });
      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  it('dispatches a setter for every changed field', () => {
    const { dispatch } = runDispatch({
      ...validFormValues(),
      groupName: 'new-group',
      runnerTag: 'new-runner',
      measurementTrials: '10',
    });
    expect(dispatch).toHaveBeenCalledTimes(3);
    expect(dispatch).toHaveBeenCalledWith(setGroupName('new-group'));
    expect(dispatch).toHaveBeenCalledWith(setRunnerTag('new-runner'));
    expect(dispatch).toHaveBeenCalledWith(setTrials(10));
  });

  const refreshFields: Array<keyof FormValues> = [
    'groupName',
    'dtDirectory',
    'commonLibraryProjectName',
    'branchName',
  ];

  it.each(refreshFields)('returns true when %s changes', (field) => {
    const { needsRefresh } = runDispatch({
      ...validFormValues(),
      [field]: 'changed',
    });
    expect(needsRefresh).toBe(true);
  });

  const nonRefreshFields: Array<keyof FormValues> = [
    'runnerTag',
    'measurementSecondaryRunnerTag',
    'measurementPrimaryDTName',
    'measurementSecondaryDTName',
  ];

  it.each(nonRefreshFields)('returns false when only %s changes', (field) => {
    const { needsRefresh } = runDispatch({
      ...validFormValues(),
      [field]: 'changed',
    });
    expect(needsRefresh).toBe(false);
  });

  it('returns false when only measurementTrials changes', () => {
    const { needsRefresh } = runDispatch({
      ...validFormValues(),
      measurementTrials: '10',
    });
    expect(needsRefresh).toBe(false);
  });
});
