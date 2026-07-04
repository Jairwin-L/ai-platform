'use client';

import { EditOutlined, SaveOutlined } from '@ant-design/icons';
import { Button, Form, Input } from 'antd';
import { useState } from 'react';
import { usePermission } from '@/hooks/use-permission';
import { updateUser } from '@/api/modules/users';
import styles from './page.module.scss';

export function AccountProfileForm({ profile }: IAppPages.AccountProfileFormProps) {
  const { setCurrentUserProfile } = usePermission();
  const [form] = Form.useForm<IAppForms.ProfileFormValues>();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  function onStartEditing() {
    form.setFieldsValue({
      nick_name: profile.nick_name ?? '',
      bio: profile.bio ?? '',
    });
    setEditing(true);
  }

  function onCancelEditing() {
    form.resetFields();
    setEditing(false);
  }
  function onFormSubmit() {
    form.submit();
  }

  async function onFinish(values: IAppForms.ProfileFormValues) {
    setSaving(true);

    try {
      const updatedProfile = await updateUser(profile.id, values);
      setCurrentUserProfile(updatedProfile);
      setEditing(false);
    } catch {
      // 请求错误由 alova 全局提示处理。
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles['panel-heading']}>
        <div>
          <h2 className={styles['panel-title']}>个人资料</h2>
          <p className={styles['panel-description']}>可修改昵称和个人简介。</p>
        </div>
        {!editing ? (
          <Button icon={<EditOutlined />} type="primary" onClick={onStartEditing}>
            编辑资料
          </Button>
        ) : null}
      </div>

      {editing ? (
        <>
          <Form
            disabled={saving}
            form={form}
            layout="vertical"
            requiredMark="optional"
            onFinish={onFinish}
          >
            <Form.Item label="昵称" name="nick_name">
              <Input maxLength={120} placeholder="请输入昵称" />
            </Form.Item>
            <Form.Item label="个人简介" name="bio">
              <Input.TextArea maxLength={500} rows={4} showCount placeholder="请输入个人简介" />
            </Form.Item>
          </Form>
          <div className={styles['edit-actions']}>
            <Button disabled={saving} onClick={onCancelEditing}>
              取消
            </Button>
            <Button
              htmlType="submit"
              onClick={onFormSubmit}
              icon={<SaveOutlined />}
              loading={saving}
              type="primary"
            >
              保存修改
            </Button>
          </div>
        </>
      ) : null}
    </section>
  );
}
