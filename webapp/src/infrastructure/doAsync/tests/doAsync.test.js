import doAsync, { cacheHit } from '../doAsync'
import * as doAsyncLogic from '../doAsyncLogic'
import * as reactReduxMock from 'react-redux'
import http from '../../http'

import { buildHeaders } from '../doAsyncLogic'
import * as httpCacheActions from '../../httpCache/httpCache.actions'
import * as httpCacheSelectors from '../../httpCache/httpCache.selectors'

jest.mock('../doAsyncLogic')
jest.mock('react-redux')
jest.mock('../../http')
jest.mock('../../httpCache/httpCache.actions')
jest.mock('../../httpCache/httpCache.selectors')

let dispatch
let getState

describe('Given we call doAsync ', () => {
	beforeEach(() => {
		dispatch = reactReduxMock.useDispatch()
		getState = reactReduxMock.useStore().getState
	})

	afterEach(() => {
		dispatch.mockReset()
		getState.mockReset()
		doAsyncLogic.validateInput.mockReset()
		doAsyncLogic.requestIsAlreadyPending.mockReset()
		httpCacheActions.addRequestToCache.mockReset()
		httpCacheSelectors.tryToFindRequestInCache.mockReset()
		http.get.mockReset()
		http.post.mockReset()
		http.put.mockReset()
	})

	describe('When validateInput throws ', () => {
		it('Then logError is called and we rethrow exception ', () => {
			expect(doAsync).toBeTruthy()

			const expectedErrorMessage = 'expectedErrorMessage'

			doAsyncLogic.validateInput.mockImplementation(() => {
				throw new Error(expectedErrorMessage)
			})

			const url = 'url'
			const httpMethod = 'get'
			const errorMessage = 'errorMessage'

			try {
				doAsync({
					url,
					httpMethod,
					errorMessage,
					dispatch,
					getState,
				})

				throw new Error('validateInput should have thrown an error')
			} catch (e) {
				expect(e.message).toEqual(expectedErrorMessage)
				expect(doAsyncLogic.validateInput.mock.calls[0]).toEqual([
					url,
					httpMethod,
				])
			}
		})
	})

	describe('When a request is pending ', () => {
		it('Then actionType.REQUESTED is dispatched and nothing else is dispatched ', async () => {
			expect(doAsync).toBeTruthy()

			const url = 'url'
			const httpMethod = 'httpMethod'
			const errorMessage = 'errorMessage'
			const noBusySpinner = 'noBusySpinner'
			const httpConfig = 'httpConfig'
			const useCaching = 'useCaching'

			doAsyncLogic.requestIsAlreadyPending.mockReturnValue(true)

			try {
				return doAsync({
					noBusySpinner,
					url,
					httpMethod,
					httpConfig,
					errorMessage,
					useCaching,
					dispatch,
					getState,
				})
			} catch (r) {
				expect(r.toString()).toBe(
					'Error: Aysnc operation aborted. This is not an error condition but reported as one due to limitations of redux-toolkit'
				)

				expect(doAsyncLogic.requestIsAlreadyPending.mock.calls.length).toBe(1)
				expect(doAsyncLogic.requestIsAlreadyPending.mock.calls[0][0]).toEqual({
					noBusySpinner,
					url,
					httpMethod,
					dispatch,
					httpConfig,
					getState,
				})
			}
		})
	})

	describe("When arguments are valid and request isn't pending ", () => {
		describe('and the http returns rejected promise', () => {
			it('Then handleError is called ', (done) => {
				const expectedBody = 'expectedBody'
				const expectedError = 'expectedError'

				http.get.mockImplementation(() => Promise.reject(expectedError))

				testDoAsync({ expectedBody, expectProcessResult: false })
					.then(({ url, httpMethod, errorMessage, httpConfig }) => {
						expect(doAsyncLogic.handleError.mock.calls.length).toEqual(1)
						expect(doAsyncLogic.handleError.mock.calls[0][0]).toEqual(
							expectedError
						)
						expect(doAsyncLogic.handleError.mock.calls[0][3]).toEqual(
							httpMethod
						)
						expect(doAsyncLogic.handleError.mock.calls[0][4]).toEqual(url)
						expect(doAsyncLogic.handleError.mock.calls[0][5]).toEqual(
							httpConfig
						)
						expect(doAsyncLogic.handleError.mock.calls[0][6]).toEqual(
							errorMessage
						)

						done()
					})
					.catch(done.fail)
			})
		})

		describe('and the httpMethod is GET', () => {
			it('Then actionType.REQUESTED is dispatched and nothing else is dispatched ', async () => {
				const expectedBody = 'expectedBody'

				http.get.mockReturnValue(Promise.resolve(expectedBody))

				return testDoAsync({ expectedBody }).then(({ url, httpConfig }) => {
					expect(http.get.mock.calls.length).toBe(1)
					expect(http.get.mock.calls[0][0]).toEqual(url)
					expect(http.get.mock.calls[0][1]).toEqual(httpConfig)
				})
			})
		})

		describe('and the httpMethod is POST', () => {
			it('Then actionType.REQUESTED is dispatched and nothing else is dispatched ', async () => {
				const expectedBody = 'expectedBody'

				http.post.mockReturnValue(Promise.resolve(expectedBody))

				return testDoAsync({ expectedBody, httpMethod: 'post' }).then(
					({ url, httpConfig }) => {
						expect(http.post.mock.calls.length).toBe(1)
						expect(http.post.mock.calls[0][0]).toEqual(url)
						expect(http.post.mock.calls[0][1]).toEqual(httpConfig)
					}
				)
			})
		})

		describe('and the httpMethod is PUT', () => {
			it('Then actionType.REQUESTED is dispatched and nothing else is dispatched ', async () => {
				const expectedBody = 'expectedBody'

				http.put.mockReturnValue(Promise.resolve(expectedBody))

				return testDoAsync({ expectedBody, httpMethod: 'put' }).then(
					({ url, httpConfig }) => {
						expect(http.put.mock.calls.length).toBe(1)
						expect(http.put.mock.calls[0][0]).toEqual(url)
						expect(http.put.mock.calls[0][1]).toEqual(httpConfig)
					}
				)
			})
		})

		describe('and useCaching is true ', () => {
			describe('and request is NOT in cache ', () => {
				describe('and httpMethdo is GET ', () => {
					it('Then actionType.REQUESTED is dispatched and nothing else is dispatched ', async () => {
						const expectedBody = 'expectedBody'
						http.get.mockReturnValue(Promise.resolve(expectedBody))

						return testUseCachingWithRequestNotInCache({ expectedBody }).then(
							({ url, httpConfig }) => {
								expect(http.get.mock.calls.length).toBe(1)
								expect(http.get.mock.calls[0][0]).toEqual(url)
								expect(http.get.mock.calls[0][1]).toEqual(httpConfig)
							}
						)
					})
				})

				describe('and httpMethdo is POST ', () => {
					it('Then actionType.REQUESTED is dispatched and nothing else is dispatched ', async () => {
						const expectedBody = 'expectedBody'
						http.post.mockReturnValue(Promise.resolve(expectedBody))

						return testUseCachingWithRequestNotInCache({
							expectedBody,
							httpMethod: 'post',
						}).then(({ url, httpConfig }) => {
							expect(http.post.mock.calls.length).toBe(1)
							expect(http.post.mock.calls[0][0]).toEqual(url)
							expect(http.post.mock.calls[0][1]).toEqual(httpConfig)
						})
					})
				})

				describe('and httpMethdo is PUT ', () => {
					it('Then actionType.REQUESTED is dispatched and nothing else is dispatched ', async () => {
						const expectedBody = 'expectedBody'
						http.put.mockReturnValue(Promise.resolve(expectedBody))

						return testUseCachingWithRequestNotInCache({
							expectedBody,
							httpMethod: 'put',
						}).then(({ url, httpConfig }) => {
							expect(http.put.mock.calls.length).toBe(1)
							expect(http.put.mock.calls[0][0]).toEqual(url)
							expect(http.put.mock.calls[0][1]).toEqual(httpConfig)
						})
					})
				})
			})

			describe('and request is in cache ', () => {
				describe('and httpMethod is GET ', () => {
					it(
						'Then cacheHit is dispatched, cleanUpPendingRequest is called ' +
							'and actionType.REQUESTED are dispatched and nothing else is dispatched ',
						async () => {
							return testUseCachingWithRequestInCache()
						}
					)
				})

				describe('and httpMethod is POST ', () => {
					it(
						'Then cacheHit is dispatched, cleanUpPendingRequest is called ' +
							'and actionType.REQUESTED are dispatched and nothing else is dispatched ',
						async () => {
							return testUseCachingWithRequestInCache({ httpMethod: 'post' })
						}
					)
				})

				describe('and httpMethod is PUT ', () => {
					it(
						'Then cacheHit is dispatched, cleanUpPendingRequest is called ' +
							'and actionType.REQUESTED are dispatched and nothing else is dispatched ',
						async () => {
							return testUseCachingWithRequestInCache({ httpMethod: 'put' })
						}
					)
				})
			})
		})
	})
})

function testUseCachingWithRequestNotInCache({
	expectedBody,
	httpMethod = 'get',
} = {}) {
	expect(doAsync).toBeTruthy()
	expect(httpCacheActions.addRequestToCache.mock).toBeTruthy()

	const url = 'url'
	const errorMessage = 'errorMessage'
	const noBusySpinner = 'noBusySpinner'
	const httpConfig = 'httpConfig'
	const useCaching = true
	const expectedAddRequestToCacheResult = 'expectedAddRequestToCacheResult'

	httpCacheSelectors.tryToFindRequestInCache.mockReturnValue(false)

	httpCacheActions.addRequestToCache.mockReturnValue(
		expectedAddRequestToCacheResult
	)

	return doAsync({
		noBusySpinner,
		url,
		httpMethod,
		httpConfig,
		errorMessage,
		useCaching,
		dispatch,
		getState,
	}).then((r) => {
		expect(doAsyncLogic.requestIsAlreadyPending.mock.calls.length).toBe(1)

		expect(doAsyncLogic.requestIsAlreadyPending.mock.calls[0][0]).toEqual({
			noBusySpinner,
			url,
			httpMethod,
			dispatch,
			httpConfig,
			getState,
		})

		expect(dispatch.mock.calls.length).toBe(2)

		expect(dispatch.mock.calls[0][0]).toEqual({
			type: actionType.REQUESTED,
			payload: {
				noBusySpinner,
				useCaching,
			},
		})

		expect(dispatch.mock.calls[1][0]).toEqual(expectedAddRequestToCacheResult)

		const tempHttpConfig = {
			...httpConfig,
			...buildHeaders(url, httpConfig),
		}

		expect(doAsyncLogic.processHttpResult.mock.calls.length).toBe(1)
		expect(doAsyncLogic.processHttpResult.mock.calls[0][0]).toEqual({
			body: expectedBody,
			dispatch,
			noBusySpinner,
			httpMethod,
			url,
			httpConfig: tempHttpConfig,
			errorMessage,
			getState,
		})

		return {
			url,
			httpConfig: tempHttpConfig,
		}
	})
}

function testUseCachingWithRequestInCache({ httpMethod = 'get' } = {}) {
	expect(doAsync).toBeTruthy()
	expect(httpCacheActions.addRequestToCache.mock).toBeTruthy()

	const url = 'url'
	const errorMessage = 'errorMessage'
	const noBusySpinner = 'noBusySpinner'
	const httpConfig = 'httpConfig'
	const useCaching = true
	const expectedBody = 'expectedBody'
	const expectedAddRequestToCacheResult = 'expectedAddRequestToCacheResult'

	http.get.mockReturnValue(Promise.resolve(expectedBody))

	httpCacheSelectors.tryToFindRequestInCache.mockReturnValue(true)

	httpCacheActions.addRequestToCache.mockReturnValue(
		expectedAddRequestToCacheResult
	)

	return doAsync({
		noBusySpinner,
		url,
		httpMethod,
		httpConfig,
		errorMessage,
		useCaching,
		dispatch,
		getState,
	}).then((r) => {
		expect(doAsyncLogic.requestIsAlreadyPending.mock.calls.length).toBe(1)

		expect(doAsyncLogic.requestIsAlreadyPending.mock.calls[0][0]).toEqual({
			noBusySpinner,
			url,
			httpMethod,
			dispatch,
			httpConfig,
			getState,
		})

		expect(dispatch.mock.calls.length).toBe(2)

		expect(dispatch.mock.calls[0][0]).toEqual({
			type: actionType.REQUESTED,
			payload: {
				noBusySpinner,
				useCaching,
			},
		})

		expect(dispatch.mock.calls[1][0]).toEqual(
			cacheHit(url, httpMethod, noBusySpinner)
		)
	})
}

function testDoAsync({
	expectedBody,
	httpMethod = 'get',
	expectProcessResult = true,
} = {}) {
	expect(doAsync).toBeTruthy()

	const url = 'url'
	const errorMessage = 'errorMessage'
	const noBusySpinner = 'noBusySpinner'
	const httpConfig = 'httpConfig'
	const useCaching = false

	return doAsync({
		noBusySpinner,
		url,
		httpMethod,
		httpConfig,
		errorMessage,
		useCaching,
		dispatch,
		getState,
	}).then((r) => {
		expect(doAsyncLogic.requestIsAlreadyPending.mock.calls.length).toBe(1)
		expect(doAsyncLogic.requestIsAlreadyPending.mock.calls[0][0]).toEqual({
			noBusySpinner,
			url,
			httpMethod,
			dispatch,
			httpConfig,
			getState,
		})

		const tempHttpConfig = {
			...httpConfig,
			...buildHeaders(url, httpConfig),
		}

		if (expectProcessResult) {
			expect(doAsyncLogic.processHttpResult.mock.calls.length).toBe(1)
			expect(doAsyncLogic.processHttpResult.mock.calls[0][0]).toEqual({
				body: expectedBody,
				dispatch,
				noBusySpinner,
				httpMethod,
				url,
				httpConfig: tempHttpConfig,
				errorMessage,
				getState,
			})
		}

		return {
			url,
			httpConfig: tempHttpConfig,
			httpMethod,
			errorMessage,
		}
	})
}
