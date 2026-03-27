import { configureStore, createSlice } from '@reduxjs/toolkit'

const dummySlice = createSlice({
  name: 'dummy',
  initialState: {},
  reducers: {}
})

export const store = configureStore({
  reducer: { dummy: dummySlice.reducer }
})