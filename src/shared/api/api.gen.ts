/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface SlideRequestDTO {
  /** @format int32 */
  order: number;
  kind?: string;
  eyebrow?: string;
  title: string;
  body?: string;
  points?: string[];
  imageUrl?: string;
}

export interface ModuleRequestDTO {
  /** @format int32 */
  order: number;
  title: string;
  description?: string;
  /** @format date */
  opensAt?: string;
}

export interface LessonRequestDTO {
  /** @format int32 */
  order: number;
  title: string;
  description?: string;
  videoUrl?: string;
}

export interface CourseRequestDTO {
  title: string;
  subtitle?: string;
  chatLabel?: string;
  chatUrl?: string;
  supportLabel?: string;
  supportUrl?: string;
}

export interface VerifyCodeDTO {
  email: string;
  code: string;
}

export interface AuthResponseDTO {
  token?: string;
  role?: string;
  email?: string;
}

export interface RequestCodeDTO {
  email: string;
}

export interface StudentRequestDTO {
  email: string;
}

export interface StudentDTO {
  id?: string;
  email?: string;
  active?: boolean;
  plan?: string;
}

export interface PresignUploadRequestDTO {
  filename: string;
  contentType?: string;
  prefix?: string;
}

export interface OnboardingResponseDTO {
  slides?: SlideDTO[];
  support?: SupportDTO;
}

export interface SlideDTO {
  id?: string;
  /** @format int32 */
  order?: number;
  kind?: string;
  eyebrow?: string;
  title?: string;
  body?: string;
  points?: string[];
  image?: string;
  imageKey?: string;
}

export interface SupportDTO {
  chatLabel?: string;
  chatUrl?: string;
  supportLabel?: string;
  supportUrl?: string;
}

export interface CourseDTO {
  id?: string;
  title?: string;
  subtitle?: string;
  /** @format int32 */
  modulesCount?: number;
}

export interface CourseResponseDTO {
  course?: CourseDTO;
  support?: SupportDTO;
  modules?: ModuleDTO[];
}

export interface LessonDTO {
  id?: string;
  title?: string;
  description?: string;
  videoUrl?: string;
  videoKey?: string;
}

export interface ModuleDTO {
  id?: string;
  /** @format int32 */
  order?: number;
  title?: string;
  description?: string;
  status?: string;
  opensAt?: string;
  lessons?: LessonDTO[];
}

import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  HeadersDefaults,
  ResponseType,
} from "axios";
import axios from "axios";

export type QueryParamsType = Record<string | number, any>;

export interface FullRequestParams
  extends Omit<AxiosRequestConfig, "data" | "params" | "url" | "responseType"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseType;
  /** request body */
  body?: unknown;
}

export type RequestParams = Omit<
  FullRequestParams,
  "body" | "method" | "query" | "path"
>;

export interface ApiConfig<SecurityDataType = unknown>
  extends Omit<AxiosRequestConfig, "data" | "cancelToken"> {
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<AxiosRequestConfig | void> | AxiosRequestConfig | void;
  secure?: boolean;
  format?: ResponseType;
}

export enum ContentType {
  Json = "application/json",
  JsonApi = "application/vnd.api+json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public instance: AxiosInstance;
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private secure?: boolean;
  private format?: ResponseType;

  constructor({
    securityWorker,
    secure,
    format,
    ...axiosConfig
  }: ApiConfig<SecurityDataType> = {}) {
    this.instance = axios.create({
      ...axiosConfig,
      baseURL: axiosConfig.baseURL || "http://localhost:8091",
    });
    this.secure = secure;
    this.format = format;
    this.securityWorker = securityWorker;
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected mergeRequestParams(
    params1: AxiosRequestConfig,
    params2?: AxiosRequestConfig,
  ): AxiosRequestConfig {
    const method = params1.method || (params2 && params2.method);

    return {
      ...this.instance.defaults,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...((method &&
          this.instance.defaults.headers[
            method.toLowerCase() as keyof HeadersDefaults
          ]) ||
          {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected stringifyFormItem(formItem: unknown) {
    if (typeof formItem === "object" && formItem !== null) {
      return JSON.stringify(formItem);
    } else {
      return `${formItem}`;
    }
  }

  protected createFormData(input: Record<string, unknown>): FormData {
    if (input instanceof FormData) {
      return input;
    }
    return Object.keys(input || {}).reduce((formData, key) => {
      const property = input[key];
      const propertyContent: any[] =
        property instanceof Array ? property : [property];

      for (const formItem of propertyContent) {
        const isFileType = formItem instanceof Blob || formItem instanceof File;
        formData.append(
          key,
          isFileType ? formItem : this.stringifyFormItem(formItem),
        );
      }

      return formData;
    }, new FormData());
  }

  public request = async <T = any, _E = any>({
    secure,
    path,
    type,
    query,
    format,
    body,
    ...params
  }: FullRequestParams): Promise<AxiosResponse<T>> => {
    const secureParams =
      ((typeof secure === "boolean" ? secure : this.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const responseFormat = format || this.format || undefined;

    if (
      type === ContentType.FormData &&
      body &&
      body !== null &&
      typeof body === "object"
    ) {
      body = this.createFormData(body as Record<string, unknown>);
    }

    if (
      type === ContentType.Text &&
      body &&
      body !== null &&
      typeof body !== "string"
    ) {
      body = JSON.stringify(body);
    }

    return this.instance.request({
      ...requestParams,
      headers: {
        ...(requestParams.headers || {}),
        ...(type ? { "Content-Type": type } : {}),
      },
      params: query,
      responseType: responseFormat,
      data: body,
      url: path,
    });
  };
}

/**
 * @title edu.anyforms
 * @version 1.0.0
 * @baseUrl http://localhost:8091
 *
 * API учебной платформы anyforms. Вход: запросить код на почту, обменять на JWT, нажать Authorize.
 */
export class Api<
  SecurityDataType extends unknown,
> extends HttpClient<SecurityDataType> {
  api = {
    /**
     * @description После сохранения слайды перенумеровываются по порядку: 1, 2, 3…
     *
     * @tags AdminOnboarding
     * @name UpdateSlide
     * @summary Обновить слайд
     * @request PUT:/api/admin/onboarding/slides/{slideId}
     * @secure
     */
    updateSlide: (
      slideId: string,
      data: SlideRequestDTO,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/api/admin/onboarding/slides/${slideId}`,
        method: "PUT",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags AdminOnboarding
     * @name DeleteSlide
     * @summary Удалить слайд
     * @request DELETE:/api/admin/onboarding/slides/{slideId}
     * @secure
     */
    deleteSlide: (slideId: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/admin/onboarding/slides/${slideId}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin
     * @name UpdateModule
     * @summary Обновить модуль
     * @request PUT:/api/admin/modules/{moduleId}
     * @secure
     */
    updateModule: (
      moduleId: string,
      data: ModuleRequestDTO,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/api/admin/modules/${moduleId}`,
        method: "PUT",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin
     * @name DeleteModule
     * @summary Удалить модуль (вместе с уроками)
     * @request DELETE:/api/admin/modules/{moduleId}
     * @secure
     */
    deleteModule: (moduleId: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/admin/modules/${moduleId}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin
     * @name UpdateLesson
     * @summary Обновить урок
     * @request PUT:/api/admin/lessons/{lessonId}
     * @secure
     */
    updateLesson: (
      lessonId: string,
      data: LessonRequestDTO,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/api/admin/lessons/${lessonId}`,
        method: "PUT",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin
     * @name DeleteLesson
     * @summary Удалить урок
     * @request DELETE:/api/admin/lessons/{lessonId}
     * @secure
     */
    deleteLesson: (lessonId: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/admin/lessons/${lessonId}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),

    /**
     * @description Все модули и уроки, включая закрытые
     *
     * @tags Admin
     * @name GetCourse1
     * @summary Курс целиком для админки
     * @request GET:/api/admin/course
     * @secure
     */
    getCourse1: (params: RequestParams = {}) =>
      this.request<CourseResponseDTO, any>({
        path: `/api/admin/course`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin
     * @name UpdateCourse
     * @summary Обновить шапку курса
     * @request PUT:/api/admin/course
     * @secure
     */
    updateCourse: (data: CourseRequestDTO, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/admin/course`,
        method: "PUT",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description Ответ: token (Bearer для Authorize в Swagger), role (ADMIN | STUDENT), email
     *
     * @tags Auth
     * @name Verify
     * @summary Обменять код на JWT
     * @request POST:/api/auth/verify
     */
    verify: (data: VerifyCodeDTO, params: RequestParams = {}) =>
      this.request<AuthResponseDTO, any>({
        path: `/api/auth/verify`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description Доступ клиента проверяется в anyforms-5 (оплаченная покупка курса), админы берутся из service_user
     *
     * @tags Auth
     * @name RequestCode
     * @summary Отправить код входа на почту
     * @request POST:/api/auth/request-code
     */
    requestCode: (data: RequestCodeDTO, params: RequestParams = {}) =>
      this.request<Record<string, string>, any>({
        path: `/api/auth/request-code`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Students
     * @name GetAll
     * @summary Все клиенты
     * @request GET:/api/admin/students
     * @secure
     */
    getAll: (params: RequestParams = {}) =>
      this.request<StudentDTO[], any>({
        path: `/api/admin/students`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Students
     * @name Create
     * @summary Дать клиенту доступ к курсу
     * @request POST:/api/admin/students
     * @secure
     */
    create: (data: StudentRequestDTO, params: RequestParams = {}) =>
      this.request<StudentDTO, any>({
        path: `/api/admin/students`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description Файл уходит из браузера сразу в бакет (PUT по uploadUrl), бэкенд только подписывает. Вернувшийся key сохраняем в модуль/урок. Требует CORS на бакете.
     *
     * @tags Admin
     * @name PresignUpload
     * @summary Подписанный URL для прямой загрузки в S3
     * @request POST:/api/admin/presign-upload
     * @secure
     */
    presignUpload: (
      data: PresignUploadRequestDTO,
      params: RequestParams = {},
    ) =>
      this.request<Record<string, string>, any>({
        path: `/api/admin/presign-upload`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description kind: TEXT (обычный), SUPPORT (со ссылками), FINAL (последний). В title слово в {фигурных скобках} выделяется акцентом
     *
     * @tags AdminOnboarding
     * @name CreateSlide
     * @summary Создать слайд
     * @request POST:/api/admin/onboarding/slides
     * @secure
     */
    createSlide: (data: SlideRequestDTO, params: RequestParams = {}) =>
      this.request<Record<string, string>, any>({
        path: `/api/admin/onboarding/slides`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin
     * @name CreateModule
     * @summary Создать модуль
     * @request POST:/api/admin/modules
     * @secure
     */
    createModule: (data: ModuleRequestDTO, params: RequestParams = {}) =>
      this.request<Record<string, string>, any>({
        path: `/api/admin/modules`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin
     * @name CreateLesson
     * @summary Создать урок в модуле
     * @request POST:/api/admin/modules/{moduleId}/lessons
     * @secure
     */
    createLesson: (
      moduleId: string,
      data: LessonRequestDTO,
      params: RequestParams = {},
    ) =>
      this.request<Record<string, string>, any>({
        path: `/api/admin/modules/${moduleId}/lessons`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * @description Слайды по порядку + ссылки поддержки для слайда с kind = SUPPORT
     *
     * @tags Onboarding
     * @name GetOnboarding
     * @summary Слайды онбординга
     * @request GET:/api/onboarding
     * @secure
     */
    getOnboarding: (params: RequestParams = {}) =>
      this.request<OnboardingResponseDTO, any>({
        path: `/api/onboarding`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * @description Курс, модули с уроками (уроки только у открытых модулей), ссылки поддержки
     *
     * @tags Course
     * @name GetCourse
     * @summary Курс целиком
     * @request GET:/api/course
     * @secure
     */
    getCourse: (params: RequestParams = {}) =>
      this.request<CourseResponseDTO, any>({
        path: `/api/course`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * @description Как публичный ответ, но с imageKey — сырым значением для редактирования
     *
     * @tags AdminOnboarding
     * @name GetOnboarding1
     * @summary Слайды онбординга для админки
     * @request GET:/api/admin/onboarding
     * @secure
     */
    getOnboarding1: (params: RequestParams = {}) =>
      this.request<OnboardingResponseDTO, any>({
        path: `/api/admin/onboarding`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Students
     * @name Delete
     * @summary Отозвать доступ
     * @request DELETE:/api/admin/students/{id}
     * @secure
     */
    delete: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/admin/students/${id}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),
  };
}
